import { useCallback, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { DashboardAnalytics } from '@/lib/types';
import { logger } from '@/lib/logger';
import { useAuth } from '@/hooks/use-auth';

interface UseDashboardAnalyticsOptions {
  days?: number;
  limit?: number;
  refetchInterval?: number;
  enabled?: boolean;
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
    refetchInterval = 300000, // 5 minutes instead of 1 minute
    enabled = true,
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

  // SWR configuration for better performance
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
      // Stale-while-revalidate configuration
      refreshInterval: 30000, // Poll every 30 seconds for new calls
      revalidateOnFocus: true, // Enable focus revalidation to catch new calls
      revalidateOnReconnect: true, // Revalidate when connection is restored
      revalidateIfStale: false, // Always fetch fresh data
      dedupingInterval: 5000, // Reduce deduping to 5 seconds

      // Cache configuration
      focusThrottleInterval: 10000, // Reduce focus throttle to 10 seconds

      // Error handling
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 5000,

      // Performance optimizations
      // Keep previous data during background revalidation so UI doesn't go blank
      keepPreviousData: false, // Don't keep stale data - show loading state for fresh data

      onSuccess: data => {
        logger.info(
          'DASHBOARD_ANALYTICS_SWR',
          'Analytics data updated via SWR',
          {
            totalCalls: data.metrics?.totalCalls || 0,
            recentCallsCount: data.recentCalls?.length || 0,
            timeRange: `${days} days`,
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
    if (!user) {
      // User logged out - immediately clear all cached data
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

  return {
    analytics: analytics || null,
    isLoading,
    error,
    refetch,
    isRefetching: isValidating && !isLoading, // SWR's background revalidation
  };
}
