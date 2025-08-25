'use server';

import { getPaddleServerInstance } from '@/utils/paddle/get-paddle-instance';
import { getErrorMessage, ErrorMessage } from '@/utils/paddle/data-helpers';
import { getCustomerId } from '@/utils/paddle/get-customer-id';
import type { Subscription } from '@paddle/paddle-node-sdk';

/**
 * Type alias for subscription data returned by the Paddle SDK
 * This represents the actual structure returned by paddle.subscriptions.list()
 */
export type PaddleSubscriptionData = Subscription;

/**
 * Response interface for subscription list operations
 */
interface SubscriptionResponse {
  data?: PaddleSubscriptionData[];
  hasMore: boolean;
  totalRecords: number;
  error?: string;
}

export async function getSubscriptions(): Promise<SubscriptionResponse> {
  try {
    const customerId = await getCustomerId();

    if (customerId) {
      const subscriptionCollection =
        getPaddleServerInstance().subscriptions.list({
          customerId: [customerId],
          perPage: 20,
        });
      const subscriptions = await subscriptionCollection.next();

      return {
        data: subscriptions as PaddleSubscriptionData[],
        hasMore: subscriptionCollection.hasMore,
        totalRecords: subscriptionCollection.estimatedTotal,
      };
    }
  } catch (e) {
    try {
      const Sentry = await import('@sentry/nextjs');
      Sentry.captureException(e as Error, {
        tags: { component: 'GET_SUBSCRIPTIONS' },
      });
    } catch {}
    return getErrorMessage();
  }

  // Return consistent structure for empty case (no customer ID found)
  return {
    error: 'No customer ID found',
    data: [],
    hasMore: false,
    totalRecords: 0,
  };
}
