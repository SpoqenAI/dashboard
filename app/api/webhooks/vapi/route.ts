import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { logger } from '@/lib/logger';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { sendCallSummaryEmail } from '@/lib/email/send-call-summary';

export async function POST(req: NextRequest) {
  logger.debug('VAPI_WEBHOOK', 'Vapi webhook received', {
    method: req.method,
    hasSignature: !!req.headers.get('x-vapi-secret'),
  });

  // 1. Security: Validate Vapi shared-secret header
  const requestBody = await req.text(); // Read the body as raw text (needed later even if not hashed)
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  const incomingSecret = req.headers.get('x-vapi-secret');

  if (!secret || !incomingSecret) {
    logger.error(
      'VAPI_WEBHOOK',
      'Vapi webhook secret header is missing',
      undefined,
      {
        hasSecretEnv: !!secret,
        hasHeader: !!incomingSecret,
      }
    );
    return new NextResponse('Configuration error.', { status: 500 });
  }

  if (incomingSecret !== secret) {
    logger.warn('VAPI_WEBHOOK', 'Invalid Vapi webhook secret', {
      receivedPrefix: incomingSecret.slice(0, 8),
    });
    return new NextResponse('Invalid signature.', { status: 401 });
  }

  // 2. Process the message
  try {
    const envelope = JSON.parse(requestBody);
    const message = envelope.message;

    logger.info('VAPI_WEBHOOK', 'Received Vapi webhook', {
      type: message.type,
      callId: message.call?.id,
      assistantId: message.assistant?.id,
      timestamp: new Date().toISOString(),
    });

    // We only care about end-of-call reports.  Acknowledge everything else.
    if (message.type !== 'end-of-call-report') {
      logger.debug('VAPI_WEBHOOK', 'Ignoring non-summary event', {
        type: message.type,
      });
      return new NextResponse(null, { status: 200 });
    }

    // === Handle end-of-call-report ===
    logger.info('VAPI_WEBHOOK', 'End of call report received', {
      callId: message.call?.id,
      assistantId: message.assistant?.id,
      duration: message.call?.duration,
      cost: message.call?.cost,
      transcript: message.transcript ? 'Present' : 'Not available',
    });

    // 2a. Persist analysis to call_analysis for dashboard metrics
    try {
      const callId: string | undefined = message.call?.id;
      const assistantId: string | undefined =
        message.assistant?.id ?? message.call?.assistantId;

      if (!callId || !assistantId) {
        logger.warn('VAPI_WEBHOOK', 'Missing callId or assistantId', {
          callId,
          assistantId,
        });
        throw new Error('Missing identifiers');
      }

      const supabase = createSupabaseAdmin();

      // Resolve user_id via user_settings (reuse earlier query if available)
      const { data: settingsRow, error: settingsErr } = await supabase
        .from('user_settings')
        .select('id')
        .eq('vapi_assistant_id', assistantId)
        .maybeSingle();

      if (settingsErr || !settingsRow) {
        logger.warn(
          'VAPI_WEBHOOK',
          'Could not resolve user for call analysis persistence',
          {
            assistantId,
            error: settingsErr,
          }
        );
        throw new Error('User resolution failed');
      }

      const userId: string = settingsRow.id;

      // Extract sentiment & lead quality from VAPI structured data (if any)
      const structured = message.analysis?.structuredData ?? {};
      const sentiment =
        structured.sentiment || message.analysis?.sentiment || 'neutral';
      const leadQuality =
        structured.leadQuality || structured.lead_quality || 'cold';

      const { error: insertErr } = await supabase.from('call_analysis').upsert(
        {
          user_id: userId,
          vapi_call_id: callId,
          sentiment,
          lead_quality: leadQuality,
          call_purpose: structured.callPurpose || structured.purpose || null,
          key_points: structured.keyPoints || null,
          analyzed_at: new Date().toISOString(),
        },
        {
          onConflict: 'vapi_call_id',
        }
      );

      if (insertErr) {
        logger.error(
          'VAPI_WEBHOOK',
          'Failed to upsert call_analysis from webhook',
          insertErr,
          { callId }
        );
      } else {
        logger.info('VAPI_WEBHOOK', 'call_analysis upserted', { callId });
      }
    } catch (analysisPersistErr) {
      logger.error(
        'VAPI_WEBHOOK',
        'Unexpected failure persisting call analysis',
        analysisPersistErr as Error
      );
    }

    // 2a. Attempt to email the call summary to the assistant owner.
    try {
      const assistantId: string | undefined =
        message.assistant?.id ?? message.call?.assistantId;

      if (!assistantId) {
        logger.warn('EMAIL', 'No assistantId found in end-of-call-report');
        return new NextResponse(null, { status: 200 });
      }

      const supabase = createSupabaseAdmin();

      // a. Resolve user_id via user_settings
      const { data: settingsRow, error: settingsErr } = await supabase
        .from('user_settings')
        .select('id')
        .eq('vapi_assistant_id', assistantId)
        .maybeSingle();

      if (settingsErr) {
        logger.error('EMAIL', 'Failed to fetch user_settings', settingsErr, {
          assistantId,
        });
        return new NextResponse(null, { status: 200 });
      }

      if (!settingsRow) {
        logger.warn('EMAIL', 'No user_settings row for assistantId', {
          assistantId,
        });
        return new NextResponse(null, { status: 200 });
      }

      const userId: string = settingsRow.id;

      // b. Fetch profile email & settings in parallel
      const [profileRes, settingsRes] = await Promise.all([
        supabase.from('profiles').select('email').eq('id', userId).single(),
        supabase
          .from('user_settings')
          .select('email_notifications')
          .eq('id', userId)
          .maybeSingle(),
      ]);

      const email: string | undefined = profileRes.data?.email;
      const emailNotifications: boolean =
        settingsRes.data?.email_notifications ?? true; // default to ON if missing

      if (!email) {
        logger.warn('EMAIL', 'User has no email on file; skipping send', {
          userId,
        });
        return new NextResponse(null, { status: 200 });
      }

      if (!emailNotifications) {
        logger.info(
          'EMAIL',
          'User has email notifications disabled; skipping send',
          {
            userId,
          }
        );
        return new NextResponse(null, { status: 200 });
      }

      const summary: string =
        message.summary ?? message.analysis?.summary ?? '';

      const phoneNumber: string | undefined = message.customer?.number;

      await sendCallSummaryEmail({ to: email, summary, phoneNumber });
    } catch (emailError) {
      logger.error(
        'EMAIL',
        'Unexpected failure in email flow',
        emailError as Error
      );
    }
  } catch (error) {
    logger.error(
      'VAPI_WEBHOOK',
      'Error processing Vapi webhook body',
      error instanceof Error ? error : new Error(String(error)),
      {
        bodyLength: requestBody.length,
      }
    );
    return new NextResponse('Invalid request body.', { status: 400 });
  }

  // 3. Acknowledge receipt
  return new NextResponse(null, { status: 200 });
}
