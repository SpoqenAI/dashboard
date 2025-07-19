'use server';

import { getPaddleServerInstance } from '@/utils/paddle/get-paddle-instance';
import { ErrorMessage, parseSDKResponse } from '@/utils/paddle/data-helpers';
import { createClient } from '@/lib/supabase/server';

interface SubscriptionDetailResponse {
  data?: any;
  error?: string;
}

export async function getSubscription(subscriptionId: string): Promise<SubscriptionDetailResponse> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
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
      const subscription = await getPaddleServerInstance().subscriptions.get(subscriptionId, {
        include: ['next_transaction', 'recurring_transaction_details'],
      });

      return { data: parseSDKResponse(subscription) };
    }
  } catch (e) {
    console.error('Error fetching subscription:', e);
    return { error: ErrorMessage };
  }
  
  return { error: ErrorMessage };
} 