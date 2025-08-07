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
    const callerName: string | undefined = message.customer?.name;

    // Include complete call analysis data for comprehensive email
    const callAnalysis = message.analysis || {};
    const structuredData = callAnalysis.structuredData || {};

    // Helper function to filter out N/A, empty, null, undefined values
    const filterNAValue = (value: unknown): unknown => {
      if (value === null || value === undefined) return undefined;
      if (typeof value === 'string') {
        const trimmed = value.trim().toLowerCase();
        if (
          trimmed === 'n/a' ||
          trimmed === 'na' ||
          trimmed === 'none' ||
          trimmed === ''
        ) {
          return undefined;
        }
        return value.trim();
      }
      if (Array.isArray(value)) {
        const filtered = value
          .map(item => filterNAValue(item))
          .filter(item => item !== undefined && item !== '');
        return filtered.length > 0 ? filtered : undefined;
      }
      return value;
    };

    // Process and filter all structured data fields from VAPI
    const processedCallAnalysis = {
      // Core sentiment and lead quality (highest priority)
      sentiment:
        filterNAValue(structuredData.sentiment) ||
        filterNAValue(callAnalysis.sentiment),
      leadQuality:
        filterNAValue(structuredData.leadQuality) ||
        filterNAValue(callAnalysis.leadQuality),
      leadQualityReasoning: filterNAValue(structuredData.leadQualityReasoning),
      sentimentAnalysisReasoning: filterNAValue(
        structuredData.sentimentAnalysisReasoning
      ),

      // Call details
      callPurpose: filterNAValue(structuredData.callPurpose),
      keyPoints: filterNAValue(structuredData.keyPoints),
      followUpItems: filterNAValue(structuredData.followUpItems),
      urgentConcerns: filterNAValue(structuredData.urgentConcerns),

      // Business qualifiers
      businessInterest: filterNAValue(structuredData.businessInterest),
      timeline: filterNAValue(structuredData.timeline),
      budgetMentioned: filterNAValue(structuredData.budgetMentioned),
      decisionMaker: filterNAValue(structuredData.decisionMaker),

      // Contact and next steps
      appointmentRequested: filterNAValue(structuredData.appointmentRequested),
      contactPreference: filterNAValue(structuredData.contactPreference),
    };

    // Remove undefined values to keep payload clean
    const cleanCallAnalysis = Object.fromEntries(
      Object.entries(processedCallAnalysis).filter(
        ([_, value]) => value !== undefined
      )
    );

    // Call the Supabase email function with filtered call details
    const { error: emailErr } = await supabase.functions.invoke(
      'send-email-summary',
      {
        body: {
          assistantId,
          summary,
          phoneNumber,
          callerName,
          callAnalysis: cleanCallAnalysis,
        },
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

  // Enhanced logging for debugging
  logger.info('VAPI_WEBHOOK', 'Webhook request received', {
    hasSecret: !!secret,
    hasIncomingSecret: !!incomingSecret,
    bodyLength: requestBody.length,
    headers: {
      'content-type': req.headers.get('content-type'),
      'user-agent': req.headers.get('user-agent'),
      'x-vapi-secret': incomingSecret ? '***' : 'missing',
    },
  });

  // Validate signature
  if (!secret || !incomingSecret) {
    logger.error(
      'VAPI_WEBHOOK',
      'Missing webhook secret',
      new Error('Webhook secret validation failed'),
      {
        hasSecret: !!secret,
        hasIncomingSecret: !!incomingSecret,
      }
    );
    return new NextResponse('Configuration error', { status: 500 });
  }

  // Use timing-safe comparison to prevent timing attacks
  const secretBuffer = Buffer.from(secret);
  const incomingBuffer = Buffer.from(incomingSecret);
  if (
    secretBuffer.length !== incomingBuffer.length ||
    !crypto.timingSafeEqual(secretBuffer, incomingBuffer)
  ) {
    logger.warn('VAPI_WEBHOOK', 'Invalid webhook signature', {
      secretLength: secretBuffer.length,
      incomingLength: incomingBuffer.length,
      secretPrefix: secret.substring(0, 4) + '***',
      incomingPrefix: incomingSecret.substring(0, 4) + '***',
    });
    return new NextResponse('Invalid signature', { status: 401 });
  }

  // Kick off async processing but do NOT await it
  try {
    const envelope = JSON.parse(requestBody);
    await processVapiWebhook(envelope); // wait until e-mail logic completes
    return new NextResponse(null, { status: 200 });
  } catch (err) {
    logger.error('VAPI_WEBHOOK', 'Processing failed', err as Error);
    try {
      const Sentry = await import('@sentry/nextjs');
      Sentry.captureException(err);
    } catch (_sentryErr) {}

    return new NextResponse('Processing failed', { status: 500 });
  }
}
