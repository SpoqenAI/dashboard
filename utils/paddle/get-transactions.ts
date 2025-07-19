'use server';

import { getPaddleServerInstance } from '@/utils/paddle/get-paddle-instance';
import { getErrorMessage, parseSDKResponse } from '@/utils/paddle/data-helpers';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { TransactionStatus } from '@paddle/paddle-node-sdk';

interface TransactionResponse {
  data?: any[];
  hasMore: boolean;
  totalRecords: number;
  error?: string;
}

interface GetTransactionsOptions {
  statuses?: TransactionStatus[];
  perPage?: number;
}

// Validation constants following codebase patterns
const SUBSCRIPTION_ID_PATTERN = /^(sub_|pending_)[a-zA-Z0-9_-]+$/;
const VALIDATION_CONFIG = {
  maxParameterLength: 100,
  maxCursorLength: 200, // Cursors can be longer than subscription IDs
} as const;

export async function getTransactions(
  subscriptionId: string,
  after: string,
  options: GetTransactionsOptions = {}
): Promise<TransactionResponse> {
  const { statuses = ['billed', 'paid', 'completed'], perPage = 10 } = options;

  try {
    // Validate subscriptionId parameter
    if (!subscriptionId || typeof subscriptionId !== 'string') {
      logger.warn(
        'GET_TRANSACTIONS',
        'Invalid subscriptionId: missing or not a string',
        {
          subscriptionId: subscriptionId || 'undefined',
          subscriptionIdType: typeof subscriptionId,
        }
      );
      return {
        data: [],
        hasMore: false,
        totalRecords: 0,
        error: 'Invalid subscription ID',
      };
    }

    if (subscriptionId.trim() === '') {
      logger.warn('GET_TRANSACTIONS', 'Invalid subscriptionId: empty string');
      return {
        data: [],
        hasMore: false,
        totalRecords: 0,
        error: 'Invalid subscription ID',
      };
    }

    if (subscriptionId.length > VALIDATION_CONFIG.maxParameterLength) {
      logger.warn(
        'GET_TRANSACTIONS',
        'Subscription ID exceeds maximum length',
        {
          length: subscriptionId.length,
          maxLength: VALIDATION_CONFIG.maxParameterLength,
        }
      );
      return {
        data: [],
        hasMore: false,
        totalRecords: 0,
        error: 'Invalid subscription ID',
      };
    }

    if (!SUBSCRIPTION_ID_PATTERN.test(subscriptionId)) {
      logger.warn('GET_TRANSACTIONS', 'Invalid subscription ID format', {
        subscriptionId,
        expectedPattern: SUBSCRIPTION_ID_PATTERN.source,
      });
      return {
        data: [],
        hasMore: false,
        totalRecords: 0,
        error: 'Invalid subscription ID',
      };
    }

    // Validate after parameter (cursor for pagination)
    if (!after || typeof after !== 'string') {
      logger.warn(
        'GET_TRANSACTIONS',
        'Invalid after parameter: missing or not a string',
        {
          after: after || 'undefined',
          afterType: typeof after,
        }
      );
      return {
        data: [],
        hasMore: false,
        totalRecords: 0,
        error: 'Invalid cursor parameter',
      };
    }

    if (after.trim() === '') {
      logger.warn('GET_TRANSACTIONS', 'Invalid after parameter: empty string');
      return {
        data: [],
        hasMore: false,
        totalRecords: 0,
        error: 'Invalid cursor parameter',
      };
    }

    if (after.length > VALIDATION_CONFIG.maxCursorLength) {
      logger.warn('GET_TRANSACTIONS', 'After cursor exceeds maximum length', {
        length: after.length,
        maxLength: VALIDATION_CONFIG.maxCursorLength,
      });
      return {
        data: [],
        hasMore: false,
        totalRecords: 0,
        error: 'Invalid cursor parameter',
      };
    }

    // Validate cursor format - should be alphanumeric with common cursor characters
    // Paddle cursors are typically base64-like strings or UUIDs
    const cursorPattern = /^[a-zA-Z0-9_-]+$/;
    if (!cursorPattern.test(after)) {
      logger.warn('GET_TRANSACTIONS', 'Invalid after cursor format', {
        after,
        expectedPattern: cursorPattern.source,
      });
      return {
        data: [],
        hasMore: false,
        totalRecords: 0,
        error: 'Invalid cursor parameter',
      };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: [], hasMore: false, totalRecords: 0 };
    }

    // Get customer ID from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('paddle_customer_id')
      .eq('id', user.id)
      .single();

    const customerId = profile?.paddle_customer_id;

    if (customerId) {
      const transactionCollection = getPaddleServerInstance().transactions.list(
        {
          customerId: [customerId],
          after: after,
          perPage,
          status: statuses,
          subscriptionId: subscriptionId ? [subscriptionId] : undefined,
        }
      );
      const transactionData = await transactionCollection.next();

      return {
        data: parseSDKResponse(transactionData ?? []),
        hasMore: transactionCollection.hasMore,
        totalRecords: transactionCollection.estimatedTotal,
        error: undefined,
      };
    } else {
      return { data: [], hasMore: false, totalRecords: 0 };
    }
  } catch (e) {
    console.error('Error fetching transactions:', e);
    return getErrorMessage();
  }
}
