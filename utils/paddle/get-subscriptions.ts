'use server';

import { getPaddleServerInstance } from '@/utils/paddle/get-paddle-instance';
import { getErrorMessage } from '@/utils/paddle/data-helpers';
import { createClient } from '@/lib/supabase/server';

interface SubscriptionResponse {
  data?: any[];
  hasMore: boolean;
  totalRecords: number;
  error?: string;
}

export async function getSubscriptions(): Promise<SubscriptionResponse> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
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
      const subscriptionCollection = getPaddleServerInstance().subscriptions.list({ 
        customerId: [customerId], 
        perPage: 20 
      });
      const subscriptions = await subscriptionCollection.next();
      
      return {
        data: subscriptions,
        hasMore: subscriptionCollection.hasMore,
        totalRecords: subscriptionCollection.estimatedTotal,
      };
    }
  } catch (e) {
    console.error('Error fetching subscriptions:', e);
    return getErrorMessage();
  }
  
  return { data: [], hasMore: false, totalRecords: 0 };
} 