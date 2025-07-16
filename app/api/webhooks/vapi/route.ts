import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { sendCallSummaryEmail } from '@/lib/email/send-call-summary';
// Removed Redis dependency - analysis comes directly from VAPI API calls

// Run as an Edge Function (Next.js 15+) to dramatically increase concurrency and
// (Edge Runtime removed – Node runtime is required to use the SendGrid SDK.)

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

  // Log analysis data for monitoring (no storage needed - analysis comes from VAPI API)
  if (message.analysis) {
    logger.info('VAPI_WEBHOOK', 'Call analysis received from VAPI', {
      callId: message.call?.id,
      hasVapiSummary: !!message.analysis?.summary,
      hasVapiStructuredData: !!message.analysis?.structuredData,
      hasVapiSuccessEvaluation: !!message.analysis?.successEvaluation,
      vapiStructuredDataFields: message.analysis?.structuredData
        ? Object.keys(message.analysis.structuredData)
        : null,
    });
  }

  // === Attempt to email the call summary ===
  try {
    const assistantId: string | undefined =
      message.assistant?.id ?? message.call?.assistantId;

    if (!assistantId) return;

    const supabase = createSupabaseAdmin();

    // Single query to fetch both id and email_notifications
    const { data: settingsRow, error: settingsErr } = await supabase
      .from('user_settings')
      .select('id, email_notifications')
      .eq('vapi_assistant_id', assistantId)
      .maybeSingle();

    if (settingsErr || !settingsRow) return;

    const userId = settingsRow.id;
    const emailNotifications: boolean = settingsRow.email_notifications ?? true;

    // Now, get the email from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
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
      // Enhanced: Send critical errors to Sentry for alerting
      try {
        const Sentry = await import('@sentry/nextjs');
        Sentry.captureException(err);
      } catch (sentryErr) {
        // Fail silently if Sentry import fails
      }
    }
  })();

  // Immediate ACK to Vapi
  return new NextResponse(null, { status: 200 });
}
