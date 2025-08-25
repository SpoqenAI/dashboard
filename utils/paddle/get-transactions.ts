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
const CURSOR_PATTERN = /^[a-zA-Z0-9_-]+$/;
const VALIDATION_CONFIG = {
  maxParameterLength: 100,
  maxCursorLength: 200, // Cursors can be longer than subscription IDs
} as const;

// Validation helper function to reduce code duplication
function validateParameter(
  value: unknown,
  paramName: string,
  pattern: RegExp,
  maxLength: number
): string | null {
  if (!value || typeof value !== 'string') {
    logger.warn(
      'GET_TRANSACTIONS',
      `Invalid ${paramName}: missing or not a string`,
      { [paramName]: value || 'undefined', [`${paramName}Type`]: typeof value }
    );
    return null;
  }

  const trimmed = value.trim();
  if (trimmed === '') {
    logger.warn('GET_TRANSACTIONS', `Invalid ${paramName}: empty string`);
    return null;
  }

  if (trimmed.length > maxLength) {
    logger.warn('GET_TRANSACTIONS', `${paramName} exceeds maximum length`, {
      length: trimmed.length,
      maxLength,
    });
    return null;
  }

  if (!pattern.test(trimmed)) {
    logger.warn('GET_TRANSACTIONS', `Invalid ${paramName} format`, {
      [paramName]: trimmed,
      expectedPattern: pattern.source,
    });
    return null;
  }

  return trimmed;
}

export async function getTransactions(
  subscriptionId: string,
  after: string,
  options: GetTransactionsOptions = {}
): Promise<TransactionResponse> {
  const { statuses = ['billed', 'paid', 'completed'], perPage = 10 } = options;

  try {
    // Validate parameters using helper function
    const validatedSubscriptionId = validateParameter(
      subscriptionId,
      'subscriptionId',
      SUBSCRIPTION_ID_PATTERN,
      VALIDATION_CONFIG.maxParameterLength
    );

    if (!validatedSubscriptionId) {
      return {
        data: [],
        hasMore: false,
        totalRecords: 0,
        error: 'Invalid subscription ID',
      };
    }

    const validatedAfter = validateParameter(
      after,
      'after',
      CURSOR_PATTERN,
      VALIDATION_CONFIG.maxCursorLength
    );

    if (!validatedAfter) {
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
          after: validatedAfter,
          perPage,
          status: statuses,
          subscriptionId: [validatedSubscriptionId],
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
    try {
      const Sentry = await import('@sentry/nextjs');
      Sentry.captureException(e as Error, {
        tags: { component: 'GET_TRANSACTIONS' },
      });
    } catch {}
    return getErrorMessage();
  }
}
