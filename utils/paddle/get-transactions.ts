'use server';

import { getPaddleServerInstance } from '@/utils/paddle/get-paddle-instance';
import { getErrorMessage, parseSDKResponse } from '@/utils/paddle/data-helpers';
import { createClient } from '@/lib/supabase/server';

interface TransactionResponse {
  data?: any[];
  hasMore: boolean;
  totalRecords: number;
  error?: string;
}

export async function getTransactions(
  subscriptionId: string,
  after: string
): Promise<TransactionResponse> {
  try {
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
          perPage: 10,
          status: ['billed', 'paid', 'past_due', 'completed', 'canceled'],
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
