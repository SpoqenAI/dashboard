'use server';

import { getPaddleServerInstance } from '@/utils/paddle/get-paddle-instance';
import { ErrorMessage, parseSDKResponse } from '@/utils/paddle/data-helpers';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { Subscription } from '@paddle/paddle-node-sdk';

interface SubscriptionDetailResponse {
  data?: Subscription;
  error?: string;
}

// Validation constants following codebase patterns
const SUBSCRIPTION_ID_PATTERN = /^(sub_|pending_)[a-zA-Z0-9_-]+$/;
const VALIDATION_CONFIG = {
  maxParameterLength: 100,
} as const;

export async function getSubscription(
  subscriptionId: string
): Promise<SubscriptionDetailResponse> {
  try {
    // Validate subscriptionId parameter
    if (!subscriptionId || typeof subscriptionId !== 'string') {
      logger.warn(
        'GET_SUBSCRIPTION',
        'Invalid subscriptionId: missing or not a string',
        {
          subscriptionId: subscriptionId || 'undefined',
          subscriptionIdType: typeof subscriptionId,
        }
      );
      return { error: 'Invalid subscription ID' };
    }

    if (subscriptionId.trim() === '') {
      logger.warn('GET_SUBSCRIPTION', 'Invalid subscriptionId: empty string');
      return { error: 'Invalid subscription ID' };
    }

    if (subscriptionId.length > VALIDATION_CONFIG.maxParameterLength) {
      logger.warn(
        'GET_SUBSCRIPTION',
        'Subscription ID exceeds maximum length',
        {
          length: subscriptionId.length,
          maxLength: VALIDATION_CONFIG.maxParameterLength,
        }
      );
      return { error: 'Invalid subscription ID' };
    }

    if (!SUBSCRIPTION_ID_PATTERN.test(subscriptionId)) {
      logger.warn('GET_SUBSCRIPTION', 'Invalid subscription ID format', {
        subscriptionId,
        expectedPattern: SUBSCRIPTION_ID_PATTERN.source,
      });
      return { error: 'Invalid subscription ID' };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: ErrorMessage };
    }

    // Get customer ID from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('paddle_customer_id')
      .eq('id', user.id)
      .single();

    const customerId = profile?.paddle_customer_id;

    if (customerId) {
      const subscription = await getPaddleServerInstance().subscriptions.get(
        subscriptionId,
        {
          include: ['next_transaction', 'recurring_transaction_details'],
        }
      );

      return { data: parseSDKResponse(subscription) };
    }
  } catch (e) {
    try {
      const Sentry = await import('@sentry/nextjs');
      Sentry.captureException(e as Error, {
        tags: { component: 'GET_SUBSCRIPTION' },
      });
    } catch {}
    return { error: ErrorMessage };
  }

  return { error: ErrorMessage };
}
