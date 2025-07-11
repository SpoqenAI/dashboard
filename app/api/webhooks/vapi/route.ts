import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { sendCallSummaryEmail } from '@/lib/email/send-call-summary';

// Process the envelope in the background so we can respond 200 ASAP and
// release the Vercel function slot. This greatly reduces the likelihood of
// HTTP 429 rate-limit errors when Vapi sends many `speech-update` events in
// rapid succession.
async function processVapiWebhook(envelope: any) {
  const message = envelope.message;

  logger.info('VAPI_WEBHOOK', 'Processing Vapi webhook (async)', {
    type: message.type,
    callId: message.call?.id,
  });

  // We only care about end-of-call reports
  if (message.type !== 'end-of-call-report') {
    return;
  }

  // === Persist analysis to call_analysis (same logic as before) ===
  try {
    const callId: string | undefined = message.call?.id;
    const assistantId: string | undefined =
      message.assistant?.id ?? message.call?.assistantId;

    if (!callId || !assistantId) {
      logger.warn('VAPI_WEBHOOK', 'Missing identifiers', {
        callId,
        assistantId,
      });
      throw new Error('Missing identifiers');
    }

    const supabase = createSupabaseAdmin();

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
    }
  } catch (err) {
    logger.error('VAPI_WEBHOOK', 'Analysis persistence failure', err as Error);
  }

  // === Attempt to email the call summary ===
  try {
    const assistantId: string | undefined =
      message.assistant?.id ?? message.call?.assistantId;

    if (!assistantId) return;

    const supabase = createSupabaseAdmin();

    const [profileRes, settingsRes] = await Promise.all([
      supabase
        .from('user_settings')
        .select('id')
        .eq('vapi_assistant_id', assistantId)
        .maybeSingle(),
      supabase
        .from('user_settings')
        .select('email_notifications')
        .eq('vapi_assistant_id', assistantId)
        .maybeSingle(),
    ]);

    const userRow = profileRes.data;
    const emailNotifications: boolean =
      settingsRes.data?.email_notifications ?? true;

    if (!userRow) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userRow.id)
      .single();

    const email = profile?.email;

    if (!email || !emailNotifications) return;

    const summary: string = message.summary ?? message.analysis?.summary ?? '';
    const phoneNumber: string | undefined = message.customer?.number;

    await sendCallSummaryEmail({ to: email, summary, phoneNumber });
  } catch (err) {
    logger.error('EMAIL', 'Failed in email flow', err as Error);
  }
}

export async function POST(req: NextRequest) {
  const requestBody = await req.text();
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  const incomingSecret = req.headers.get('x-vapi-secret');

  // Validate signature
  if (!secret || !incomingSecret) {
    logger.error('VAPI_WEBHOOK', 'Missing webhook secret');
    return new NextResponse('Configuration error', { status: 500 });
  }

  if (incomingSecret !== secret) {
    logger.warn('VAPI_WEBHOOK', 'Invalid webhook signature');
    return new NextResponse('Invalid signature', { status: 401 });
  }

  // Kick off async processing but do NOT await it
  (async () => {
    try {
      const envelope = JSON.parse(requestBody);
      await processVapiWebhook(envelope);
    } catch (err) {
      logger.error('VAPI_WEBHOOK', 'Async processing failed', err as Error);
    }
  })();

  // Immediate ACK to Vapi
  return new NextResponse(null, { status: 200 });
}
