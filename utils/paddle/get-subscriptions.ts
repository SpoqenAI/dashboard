'use server';

import { getPaddleServerInstance } from '@/utils/paddle/get-paddle-instance';
import { getErrorMessage } from '@/utils/paddle/data-helpers';
import { getCustomerId } from '@/utils/paddle/get-customer-id';

interface SubscriptionResponse {
  data?: any[];
  hasMore: boolean;
  totalRecords: number;
  error?: string;
}

export async function getSubscriptions(): Promise<SubscriptionResponse> {
  try {
    const customerId = await getCustomerId();
    
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