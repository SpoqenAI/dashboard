'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { StripePlan } from '@/lib/stripe';

interface Subscription {
  id: string;
  plan_type: StripePlan | 'free';
  status: 'active' | 'inactive' | 'cancelled' | 'past_due';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        setError('User not authenticated');
        return;
      }

      const { data, error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('id', user.id)
        .single();

      if (subscriptionError) {
        if (subscriptionError.code === 'PGRST116') {
          // No subscription found, create default free subscription
          const { data: newSubscription, error: createError } = await supabase
            .from('user_subscriptions')
            .insert({
              id: user.id,
              plan_type: 'free',
              status: 'active',
            })
            .select()
            .single();

          if (createError) {
            setError('Failed to create subscription record');
            return;
          }

          setSubscription(newSubscription);
        } else {
          setError('Failed to fetch subscription');
        }
        return;
      }

      setSubscription(data);
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Subscription fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  const cancelSubscription = async () => {
    if (!subscription?.stripe_subscription_id) {
      throw new Error('No active subscription to cancel');
    }

    const response = await fetch('/api/stripe/cancel-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscriptionId: subscription.stripe_subscription_id,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to cancel subscription');
    }

    // Refresh subscription data
    await fetchSubscription();
  };

  return {
    subscription,
    loading,
    error,
    refetch: fetchSubscription,
    cancelSubscription,
    isPro: subscription?.plan_type === 'professional' && subscription?.status === 'active',
    isActive: subscription?.status === 'active',
  };
} 