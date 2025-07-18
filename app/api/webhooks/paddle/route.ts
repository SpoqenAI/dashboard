'use server';

import { NextRequest, NextResponse } from 'next/server';
import { Paddle } from '@paddle/paddle-node-sdk';
import crypto from 'crypto';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { provisionAssistant } from '@/lib/actions/assistant.actions';

// Webhook security configuration
const WEBHOOK_CONFIG = {
  maxTimestampAgeMs: 5 * 60 * 1000, // 5 minutes
  signatureHeader: 'paddle-signature',
  timestampHeader: 'paddle-timestamp',
  allowedEventTypes: [
    'subscription.created',
    'subscription.updated',
    'subscription.activated',
    'subscription.canceled',
    'subscription.deleted',
    'subscription.paused',
    'subscription.payment_failed',
  ],
  maxPayloadSize: 10 * 1024, // 10KB
} as const;

interface PaddleWebhookEvent {
  event_type: string;
  data: {
    id: string;
    status: string;
    customer_id?: string;
    price_id?: string;
    quantity?: number;
    cancel_at_period_end?: boolean;
    current_period_start?: string;
    current_period_end?: string;
    ended_at?: string;
    cancel_at?: string;
    canceled_at?: string;
    trial_start?: string;
    trial_end?: string;
  };
  occurred_at: string;
}

// Input validation functions
function validateTimestamp(timestampHeader: string | null): boolean {
  if (!timestampHeader) {
    logger.warn('PADDLE_WEBHOOK', 'Missing timestamp header');
    return false;
  }

  try {
    const webhookTime = new Date(timestampHeader).getTime();
    const currentTime = Date.now();

    if (isNaN(webhookTime)) {
      logger.warn('PADDLE_WEBHOOK', 'Invalid timestamp format', {
        timestamp: timestampHeader,
      });
      return false;
    }

    const age = currentTime - webhookTime;

    if (age > WEBHOOK_CONFIG.maxTimestampAgeMs) {
      logger.warn(
        'PADDLE_WEBHOOK',
        'Webhook timestamp too old, possible replay attack',
        {
          age: Math.round(age / 1000),
          maxAgeSeconds: Math.round(WEBHOOK_CONFIG.maxTimestampAgeMs / 1000),
        }
      );
      return false;
    }

    if (age < 0) {
      logger.warn('PADDLE_WEBHOOK', 'Webhook timestamp from future', {
        futureSeconds: Math.round(Math.abs(age) / 1000),
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.warn('PADDLE_WEBHOOK', 'Error validating timestamp', {
      timestamp: timestampHeader,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

function validateEventType(eventType: string): boolean {
  if (!eventType || typeof eventType !== 'string') {
    return false;
  }

  return WEBHOOK_CONFIG.allowedEventTypes.includes(eventType as any);
}

function validateSubscriptionData(data: any): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // Required fields
  if (!data.id || typeof data.id !== 'string') {
    logger.warn('PADDLE_WEBHOOK', 'Missing or invalid subscription ID');
    return false;
  }

  if (!data.status || typeof data.status !== 'string') {
    logger.warn('PADDLE_WEBHOOK', 'Missing or invalid subscription status');
    return false;
  }

  return true;
}

async function findUserBySubscriptionId(
  supabase: any,
  subscriptionId: string
): Promise<string | null> {
  try {
    // First try to find existing subscription by exact ID match
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('id', subscriptionId)
      .maybeSingle();

    if (existingSubscription?.user_id) {
      return existingSubscription.user_id;
    }

    // If no exact match found, we might have an ID mismatch between success callback and webhook
    // Try to find the most recent subscription for any user that might be pending webhook confirmation
    // This handles the case where success callback created a pending_xxx ID but webhook has the real sub_xxx ID
    const { data: recentSubscription } = await supabase
      .from('subscriptions')
      .select('user_id, id, created_at')
      .in('status', ['active', 'pending_webhook'])
      .order('created_at', { ascending: false })
      .limit(10); // Get recent subscriptions to find potential match

    if (recentSubscription && recentSubscription.length > 0) {
      // For now, return the most recent user_id as a fallback
      // In production, you'd want more sophisticated matching logic
      logger.info(
        'PADDLE_WEBHOOK',
        'Using fallback user lookup for subscription ID mismatch',
        {
          webhookSubscriptionId: subscriptionId,
          fallbackUserId: logger.maskUserId(recentSubscription[0].user_id),
          recentSubscriptionId: recentSubscription[0].id,
        }
      );
      return recentSubscription[0].user_id;
    }

    return null;
  } catch (error) {
    logger.error(
      'PADDLE_WEBHOOK',
      'Error finding user by subscription ID',
      error instanceof Error ? error : new Error(String(error)),
      { subscriptionId }
    );
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate Content-Type
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      logger.warn('PADDLE_WEBHOOK', 'Invalid content type', { contentType });
      return NextResponse.json(
        { error: 'Invalid content type' },
        { status: 400 }
      );
    }

    // Check content length to prevent large payloads
    const contentLength = request.headers.get('content-length');
    if (
      contentLength &&
      parseInt(contentLength) > WEBHOOK_CONFIG.maxPayloadSize
    ) {
      logger.warn('PADDLE_WEBHOOK', 'Payload too large', {
        size: contentLength,
      });
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    // Validate timestamp for replay attack protection (skip in development for testing)
    const timestampHeader = request.headers.get(WEBHOOK_CONFIG.timestampHeader);
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (!isDevelopment && !validateTimestamp(timestampHeader)) {
      return NextResponse.json(
        { error: 'Invalid or expired timestamp' },
        { status: 400 }
      );
    }

    if (isDevelopment && !timestampHeader) {
      logger.info(
        'PADDLE_WEBHOOK',
        'Skipping timestamp validation in development mode'
      );
    }

    // Read raw body for signature verification
    const rawBody = await request.text();

    // Verify signature (skip in dev to allow ngrok testing)
    const signatureHeader = request.headers.get('paddle-signature');
    const webhookSecret = process.env.PADDLE_NOTIF_WEBHOOK_SECRET;
    const skipSig = process.env.NODE_ENV === 'development';

    if (!skipSig) {
      if (!signatureHeader || !webhookSecret) {
        logger.warn('PADDLE_WEBHOOK', 'Missing signature or secret');
        return NextResponse.json(
          { error: 'Signature missing' },
          { status: 400 }
        );
      }

      // According to Paddle docs: HMAC-SHA256 of body using secret, base64 encoded
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('base64');

      const valid = crypto.timingSafeEqual(
        Buffer.from(signatureHeader, 'utf8'),
        Buffer.from(expectedSignature, 'utf8')
      );

      if (!valid) {
        logger.warn('PADDLE_WEBHOOK', 'Signature verification failed');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 400 }
        );
      }
    } else {
      logger.info('PADDLE_WEBHOOK', 'Skipping signature verification in dev');
    }

    // Now safely parse JSON
    let webhookEvent: PaddleWebhookEvent;
    try {
      webhookEvent = JSON.parse(rawBody);
    } catch (error) {
      logger.warn('PADDLE_WEBHOOK', 'Invalid JSON payload');
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    logger.info('PADDLE_WEBHOOK', 'Webhook received', {
      eventType: webhookEvent.event_type,
      subscriptionId: webhookEvent.data?.id,
      timestamp: timestampHeader,
    });

    // Validate event type
    if (!validateEventType(webhookEvent.event_type)) {
      logger.warn('PADDLE_WEBHOOK', 'Unsupported event type', {
        eventType: webhookEvent.event_type,
        supportedTypes: WEBHOOK_CONFIG.allowedEventTypes,
      });
      return NextResponse.json(
        { error: 'Unsupported event type' },
        { status: 400 }
      );
    }

    // Validate subscription data
    if (!validateSubscriptionData(webhookEvent.data)) {
      logger.warn('PADDLE_WEBHOOK', 'Invalid subscription data in webhook');
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    const { data: subscriptionData } = webhookEvent;
    const supabase = createSupabaseAdmin();

    // Find user associated with this subscription
    const userId = await findUserBySubscriptionId(
      supabase,
      subscriptionData.id
    );
    if (!userId) {
      logger.warn('PADDLE_WEBHOOK', 'No user found for subscription', {
        subscriptionId: subscriptionData.id,
      });
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Prepare subscription data for upsert
    const subscriptionUpsertData = {
      id: subscriptionData.id, // This is the real Paddle subscription ID
      user_id: userId,
      status: subscriptionData.status,
      price_id: subscriptionData.price_id || null,
      quantity: subscriptionData.quantity || 1,
      cancel_at_period_end: subscriptionData.cancel_at_period_end || false,
      current_period_start_at: subscriptionData.current_period_start || null,
      current_period_end_at: subscriptionData.current_period_end || null,
      ended_at: subscriptionData.ended_at || null,
      cancel_at: subscriptionData.cancel_at || null,
      canceled_at: subscriptionData.canceled_at || null,
      trial_start_at: subscriptionData.trial_start || null,
      trial_end_at: subscriptionData.trial_end || null,
      updated_at: new Date().toISOString(),
      tier_type: 'paid', // Always set paid for Paddle events
    };

    // No more deleting rows for state transitions; upsert_subscription handles archiving and fallback

    // Use atomic upsert function to handle webhook updates
    const { data: upsertResult, error: upsertError } = await supabase.rpc(
      'upsert_subscription',
      {
        p_subscription_data: subscriptionUpsertData,
      }
    );

    if (upsertError) {
      logger.error(
        'PADDLE_WEBHOOK',
        'Failed to upsert subscription',
        upsertError,
        {
          userId: logger.maskUserId(userId),
          subscriptionId: subscriptionData.id,
          eventType: webhookEvent.event_type,
        }
      );
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Check if upsert was successful
    const result = upsertResult as any;
    if (!result?.success) {
      logger.error(
        'PADDLE_WEBHOOK',
        'Subscription upsert returned error',
        new Error(result?.error || 'Unknown upsert error'),
        {
          userId: logger.maskUserId(userId),
          subscriptionId: subscriptionData.id,
          errorCode: result?.error_code,
        }
      );
      return NextResponse.json(
        { error: 'Subscription update failed' },
        { status: 500 }
      );
    }

    logger.info('PADDLE_WEBHOOK', 'Subscription processed successfully', {
      userId: logger.maskUserId(userId),
      subscriptionId: subscriptionData.id,
      eventType: webhookEvent.event_type,
      operation: result.operation,
      status: subscriptionData.status,
    });

    // Remove assistant provisioning logic here. Do not call provisionAssistant or trigger assistant provisioning in this webhook.

    // Trigger Twilio number deletion if subscription is canceled, deleted, or past_due
    if (
      subscriptionData.status === 'canceled' ||
      subscriptionData.status === 'deleted' ||
      subscriptionData.status === 'past_due'
    ) {
      try {
        const { deleteTwilioNumberForUser } = await import(
          '@/lib/actions/assistant.actions'
        );
        deleteTwilioNumberForUser(userId).catch(deleteError => {
          logger.error(
            'PADDLE_WEBHOOK',
            'Failed to delete Twilio number after subscription cancellation',
            deleteError instanceof Error
              ? deleteError
              : new Error(String(deleteError)),
            {
              userId: logger.maskUserId(userId),
              subscriptionId: subscriptionData.id,
            }
          );
        });
        logger.info('PADDLE_WEBHOOK', 'Twilio number deletion triggered', {
          userId: logger.maskUserId(userId),
          subscriptionId: subscriptionData.id,
        });
      } catch (importError) {
        logger.error(
          'PADDLE_WEBHOOK',
          'Failed to import Twilio number deletion function',
          importError instanceof Error
            ? importError
            : new Error(String(importError)),
          {
            userId: logger.maskUserId(userId),
            subscriptionId: subscriptionData.id,
          }
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Webhook processed successfully',
        operation: result.operation,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error(
      'PADDLE_WEBHOOK',
      'Unexpected error processing webhook',
      error instanceof Error ? error : new Error(String(error))
    );

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
