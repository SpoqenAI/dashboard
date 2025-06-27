'use server';

import { NextRequest, NextResponse } from 'next/server';
import { Paddle } from '@paddle/paddle-node-sdk';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { provisionAssistant } from '@/lib/actions/assistant.actions';

// Webhook security configuration
const WEBHOOK_CONFIG = {
  maxTimestampAgeMs: 5 * 60 * 1000, // 5 minutes
  signatureHeader: 'paddle-signature',
  timestampHeader: 'paddle-timestamp',
  allowedEventTypes: ['subscription.created', 'subscription.updated', 'subscription.activated'],
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
      logger.warn('PADDLE_WEBHOOK', 'Invalid timestamp format', { timestamp: timestampHeader });
      return false;
    }
    
    const age = currentTime - webhookTime;
    
    if (age > WEBHOOK_CONFIG.maxTimestampAgeMs) {
      logger.warn('PADDLE_WEBHOOK', 'Webhook timestamp too old, possible replay attack', {
        age: Math.round(age / 1000),
        maxAgeSeconds: Math.round(WEBHOOK_CONFIG.maxTimestampAgeMs / 1000),
      });
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

async function findUserBySubscriptionId(supabase: any, subscriptionId: string): Promise<string | null> {
  try {
    // First try to find existing subscription
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('id', subscriptionId)
      .maybeSingle();

    if (existingSubscription?.user_id) {
      return existingSubscription.user_id;
    }

    // If no existing subscription, check for pending subscription with same ID
    const { data: pendingSubscription } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('id', subscriptionId)
      .eq('status', 'pending_webhook')
      .maybeSingle();

    return pendingSubscription?.user_id || null;
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
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
    }

    // Check content length to prevent large payloads
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > WEBHOOK_CONFIG.maxPayloadSize) {
      logger.warn('PADDLE_WEBHOOK', 'Payload too large', { size: contentLength });
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    // Validate timestamp for replay attack protection (skip in development for testing)
    const timestampHeader = request.headers.get(WEBHOOK_CONFIG.timestampHeader);
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!isDevelopment && !validateTimestamp(timestampHeader)) {
      return NextResponse.json({ error: 'Invalid or expired timestamp' }, { status: 400 });
    }
    
    if (isDevelopment && !timestampHeader) {
      logger.info('PADDLE_WEBHOOK', 'Skipping timestamp validation in development mode');
    }

    // Parse the webhook payload
    let webhookEvent: PaddleWebhookEvent;
    try {
      webhookEvent = await request.json();
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
      return NextResponse.json({ error: 'Unsupported event type' }, { status: 400 });
    }

    // Validate subscription data
    if (!validateSubscriptionData(webhookEvent.data)) {
      logger.warn('PADDLE_WEBHOOK', 'Invalid subscription data in webhook');
      return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 });
    }

    const { data: subscriptionData } = webhookEvent;
    const supabase = createSupabaseAdmin();

    // Find user associated with this subscription
    const userId = await findUserBySubscriptionId(supabase, subscriptionData.id);
    if (!userId) {
      logger.warn('PADDLE_WEBHOOK', 'No user found for subscription', {
        subscriptionId: subscriptionData.id,
      });
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Prepare subscription data for upsert
    const subscriptionUpsertData = {
      id: subscriptionData.id,
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
    };

    // Use atomic upsert function to handle webhook updates
    const { data: upsertResult, error: upsertError } = await supabase
      .rpc('upsert_subscription', {
        p_subscription_data: subscriptionUpsertData
      });

    if (upsertError) {
      logger.error('PADDLE_WEBHOOK', 'Failed to upsert subscription', upsertError, {
        userId: logger.maskUserId(userId),
        subscriptionId: subscriptionData.id,
        eventType: webhookEvent.event_type,
      });
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Check if upsert was successful
    const result = upsertResult as any;
    if (!result?.success) {
      logger.error('PADDLE_WEBHOOK', 'Subscription upsert returned error', new Error(result?.error || 'Unknown upsert error'), {
        userId: logger.maskUserId(userId),
        subscriptionId: subscriptionData.id,
        errorCode: result?.error_code,
      });
      return NextResponse.json({ error: 'Subscription update failed' }, { status: 500 });
    }

    logger.info('PADDLE_WEBHOOK', 'Subscription processed successfully', {
      userId: logger.maskUserId(userId),
      subscriptionId: subscriptionData.id,
      eventType: webhookEvent.event_type,
      operation: result.operation,
      status: subscriptionData.status,
    });

    // Trigger assistant provisioning if subscription is now active
    if (subscriptionData.status === 'active') {
      try {
        // Import assistant provisioning function dynamically to avoid circular imports
        const { provisionAssistant } = await import('@/lib/actions/assistant.actions');
        
        // Provision assistant in background (don't await to avoid blocking webhook response)
        provisionAssistant(userId).catch((provisionError) => {
          logger.error(
            'PADDLE_WEBHOOK',
            'Failed to provision assistant after subscription activation',
            provisionError instanceof Error ? provisionError : new Error(String(provisionError)),
            {
              userId: logger.maskUserId(userId),
              subscriptionId: subscriptionData.id,
            }
          );
        });

        logger.info('PADDLE_WEBHOOK', 'Assistant provisioning triggered', {
          userId: logger.maskUserId(userId),
          subscriptionId: subscriptionData.id,
        });
      } catch (importError) {
        logger.error(
          'PADDLE_WEBHOOK',
          'Failed to import assistant provisioning function',
          importError instanceof Error ? importError : new Error(String(importError)),
          {
            userId: logger.maskUserId(userId),
            subscriptionId: subscriptionData.id,
          }
        );
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Webhook processed successfully',
      operation: result.operation 
    }, { status: 200 });

  } catch (error) {
    logger.error(
      'PADDLE_WEBHOOK',
      'Unexpected error processing webhook',
      error instanceof Error ? error : new Error(String(error))
    );

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
