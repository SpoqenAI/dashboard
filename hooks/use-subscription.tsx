'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from './use-auth';
import { PaddleSubscription } from '@/lib/paddle';

export interface UseSubscriptionReturn {
  subscription: PaddleSubscription | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<PaddleSubscription | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabaseClient();

  // Fetch subscription data
  const fetchSubscription = useCallback(
    async (signal?: AbortSignal) => {
      if (!user) {
        setLoading(false);
        setSubscription(null);
        return;
      }

      // Check if already aborted before starting
      if (signal?.aborted) {
        return;
      }

      try {
        setError(null);
        setLoading(true);

        // Check abort signal before making request
        if (signal?.aborted) {
          return;
        }

        // Fetch the user's active subscription
        const { data, error: fetchError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .order('current_period_start_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Check abort signal after request completes
        if (signal?.aborted) {
          return;
        }

        if (fetchError) {
          throw fetchError;
        }

        // Final abort check before updating state
        if (signal?.aborted) {
          return;
        }

        setSubscription(data);
      } catch (err: any) {
        // Don't update error state if request was aborted
        if (signal?.aborted) {
          return;
        }

        console.error('Error fetching subscription:', err);
        setError(err.message);
      } finally {
        // Don't update loading state if request was aborted
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [user, supabase]
  );

  // Wrapper for manual refetch that doesn't use abort signal
  const refetch = useCallback(() => {
    return fetchSubscription();
  }, [fetchSubscription]);

  // Effect to fetch subscription data when user changes
  useEffect(() => {
    if (user) {
      const abortController = new AbortController();
      fetchSubscription(abortController.signal);

      // Return cleanup function to abort ongoing requests
      return () => {
        abortController.abort();
      };
    } else {
      // Reset state when user logs out
      setSubscription(null);
      setLoading(false);
      setError(null);
    }
  }, [user, fetchSubscription]);

  return {
    subscription,
    loading,
    error,
    refetch,
  };
}
