import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { callEventEmitter } from '@/lib/events';
import { callCache } from '@/lib/call-cache';
import crypto from 'crypto';
import type { VapiCall } from '@/lib/types';

// Envelope for Vapi webhook POST body
interface VapiWebhookEnvelope {
  message: VapiWebhookMessage;
}

// Main message structure for Vapi webhook
interface VapiWebhookMessage {
  type: string;
  call?: VapiCall;
  assistant?: VapiWebhookAssistant;
  customer?: VapiWebhookCustomer;
  endedReason?: string;
  recordingUrl?: string;
  summary?: string;
  transcript?: string;
  analysis?: VapiCall['analysis'];
  messages?: VapiWebhookChatMessage[];
  [key: string]: any; // Allow for extra fields for future compatibility
}

interface VapiWebhookAssistant {
  id?: string;
  [key: string]: any;
}

interface VapiWebhookCustomer {
  number?: string;
  name?: string;
  [key: string]: any;
}

interface VapiWebhookChatMessage {
  role: 'assistant' | 'user';
  message: string;
  [key: string]: any;
}

async function processVapiWebhook(envelope: VapiWebhookEnvelope) {
  const message = envelope.message;
  const callId: string | undefined = message.call?.id;
  const assistantId: string | undefined = message.assistant?.id;

  logger.info('VAPI_WEBHOOK', 'Processing Vapi webhook (async)', {
    type: message.type,
    callId,
  });

  // We only care about end-of-call reports
  if (message.type !== 'end-of-call-report') {
    return;
  }

  // Log analysis data for monitoring (no storage needed - analysis comes from VAPI API)
  if (message.analysis) {
    logger.info('VAPI_WEBHOOK', 'Call analysis received from VAPI', {
      callId,
      hasVapiSummary: !!message.analysis?.summary,
      hasVapiStructuredData: !!message.analysis?.structuredData,
      hasVapiSuccessEvaluation: !!message.analysis?.successEvaluation,
      vapiStructuredDataFields: message.analysis?.structuredData
        ? Object.keys(message.analysis.structuredData)
        : null,
    });
  }

  // === Emit real-time event for new call ===
  try {
    if (callId && assistantId) {
      const supabase = createSupabaseAdmin();

      // Get user ID for this assistant
      const { data: settingsRow, error: settingsErr } = await supabase
        .from('user_settings')
        .select('id')
        .eq('vapi_assistant_id', assistantId)
        .maybeSingle();

      if (!settingsErr && settingsRow) {
        const userId: string = settingsRow.id;

        // Invalidate analytics cache immediately to ensure fresh data
        callCache.clear();

        // Emit real-time event with call data to connected clients
        // Include the analysis data from the webhook for immediate display
        callEventEmitter.emit(userId, {
          type: 'new-call',
          callId,
          userId,
          timestamp: new Date().toISOString(),
          // Include the call data from webhook for immediate display
          callData: {
            id: callId,
            summary: message.summary || message.analysis?.summary,
            analysis: message.analysis,
            endedReason: message.endedReason,
            transcript: message.transcript,
            recordingUrl: message.recordingUrl,
            // Extract phone number from call object
            phoneNumber: message.customer?.number,
            callerName: message.customer?.name,
            createdAt: message.call?.createdAt || new Date().toISOString(),
            startedAt: message.call?.startedAt,
            endedAt: message.call?.endedAt,
            cost: message.call?.cost,
            durationSeconds:
              message.call?.endedAt && message.call?.startedAt
                ? Math.round(
                    (new Date(message.call.endedAt).getTime() -
                      new Date(message.call.startedAt).getTime()) /
                      1000
                  )
                : 0,
          },
        });

        logger.info(
          'VAPI_WEBHOOK',
          'Real-time call event emitted with call data',
          {
            callId,
            userId: logger.maskUserId(userId),
            activeListeners: callEventEmitter.getListenerCount(),
            hasAnalysis: !!message.analysis,
            hasStructuredData: !!message.analysis?.structuredData,
          }
        );
      }
    }
  } catch (eventErr) {
    logger.error(
      'VAPI_WEBHOOK',
      'Failed to emit real-time event',
      eventErr as Error
    );
  }

  // === Send email summary via Supabase function ===
  try {
    if (!assistantId) return;

    const supabase = createSupabaseAdmin();
    const summary: string = message.summary ?? message.analysis?.summary ?? '';
    const phoneNumber: string | undefined = message.customer?.number;

    // Call the Supabase email function
    const { error: emailErr } = await supabase.functions.invoke(
      'send-email-summary',
      {
        body: { assistantId, summary, phoneNumber },
      }
    );

    if (emailErr) {
      logger.error('EMAIL', 'Failed to invoke email function', emailErr);
    } else {
      logger.info('EMAIL', 'Email function invoked successfully', {
        assistantId,
        hasPhoneNumber: !!phoneNumber,
      });
    }
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

  // Use timing-safe comparison to prevent timing attacks
  const secretBuffer = Buffer.from(secret);
  const incomingBuffer = Buffer.from(incomingSecret);
  if (
    secretBuffer.length !== incomingBuffer.length ||
    !crypto.timingSafeEqual(secretBuffer, incomingBuffer)
  ) {
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
