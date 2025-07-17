import { useCallback, useEffect, useRef, useMemo } from 'react';
import useSWR from 'swr';
import { DashboardAnalytics } from '@/lib/types';
import { logger } from '@/lib/logger';
import { useAuth } from '@/hooks/use-auth';

interface UseDashboardAnalyticsOptions {
  days?: number;
  limit?: number;
  refetchInterval?: number;
  enabled?: boolean;
  dedupingInterval?: number;
}

// Fetcher function for SWR
const analyticsFetcher = async (url: string): Promise<DashboardAnalytics> => {
  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(
      'DASHBOARD_ANALYTICS',
      'Failed to fetch analytics',
      new Error(errorText)
    );
    throw new Error(`Failed to fetch analytics: ${response.statusText}`);
  }

  const data = await response.json();
  logger.info('DASHBOARD_ANALYTICS', 'Analytics data fetched successfully', {
    totalCalls: data.metrics?.totalCalls || 0,
    recentCallsCount: data.recentCalls?.length || 0,
  });

  return data;
};

export function useDashboardAnalytics(
  options: UseDashboardAnalyticsOptions = {}
) {
  const { user } = useAuth();
  const {
    days = 30,
    limit = 100,
    refetchInterval = 0, // REMOVED: No more scheduled polling - pure event-driven
    enabled = true,
    dedupingInterval = 30000, // 30 seconds - balance between freshness and performance
  } = options;

  // Build the URL for SWR key - CRITICAL: Include user ID to ensure cache isolation
  const url =
    enabled && user
      ? `/api/vapi/analytics?${new URLSearchParams({
          days: days.toString(),
          limit: limit.toString(),
          userId: user.id, // Include user ID in key to isolate cache by user
        }).toString()}`
      : null;

  // Check if we have cached data to determine if we need initial fetch
  const hasCachedData = useMemo(() => {
    if (!url) return false; // No URL means disabled
    // Check if SWR has cached data for this key
    return typeof window !== 'undefined' && window.__SWR_CACHE__?.[url];
  }, [url]);

  // SWR configuration for hybrid approach: initial load + events only
  const {
    data: analytics,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR(
    url, // SWR key - null when disabled or no user
    analyticsFetcher,
    {
      // Hybrid configuration: fetch once initially, then events only
      refreshInterval: 0, // REMOVED: No automatic polling
      revalidateOnFocus: false, // No focus revalidation
      revalidateOnReconnect: false, // REMOVED: No reconnect fetching
      dedupingInterval: dedupingInterval, // Reduce deduping to 30 seconds

      // Cache configuration
      focusThrottleInterval: 10000, // Reduce focus throttle to 10 seconds

      // Error handling
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 5000,

      // Performance optimizations
      // Keep previous data while revalidating to prevent UI from going blank
      keepPreviousData: true,
      onSuccess: data => {
        logger.info(
          'DASHBOARD_ANALYTICS_SWR',
          'Analytics data updated via SWR (hybrid mode)',
          {
            totalCalls: data.metrics?.totalCalls || 0,
            recentCallsCount: data.recentCalls?.length || 0,
            timeRange: `${days} days`,
            hasCachedData,
            isInitialLoad: !hasCachedData,
            source: hasCachedData ? 'webhook-triggered' : 'initial-load',
          }
        );
      },

      onError: err => {
        logger.error('DASHBOARD_ANALYTICS_SWR', 'SWR fetch error', err);
      },
    }
  );

  // CRITICAL SECURITY FIX: Clear cache when user changes
  useEffect(() => {
    // We only clear cache when the user is explicitly null (logged out),
    // not when it's undefined during the initial Auth load. This avoids
    // wiping analytics data during quick route changes or reloads.
    if (user === null) {
      mutate(undefined, false); // Clear cache without triggering revalidation
      logger.info(
        'DASHBOARD_ANALYTICS_SWR',
        'Cache cleared due to user logout'
      );
    }
  }, [user, mutate]);

  // Trigger fetch when user logs in (user id changes)
  const prevUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (user?.id && user.id !== prevUserIdRef.current) {
      prevUserIdRef.current = user.id;
      // Revalidate to ensure fresh data for the new user
      mutate();
    }
  }, [user, mutate]);

  // Manual refetch function
  const refetch = useCallback(() => {
    return mutate();
  }, [mutate]);

  // REMOVED: Custom visibilitychange revalidation
  // In hybrid mode, we only fetch on initial load and webhook events
  // No need for visibility-based revalidation since webhooks keep data fresh

  return {
    analytics: analytics || null,
    isLoading,
    error,
    refetch,
    isRefetching: isValidating && !isLoading, // SWR's background revalidation
    hasCachedData, // Expose cache status for debugging
  };
}
