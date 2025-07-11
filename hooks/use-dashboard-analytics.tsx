import { useCallback } from 'react';
import useSWR from 'swr';
import { DashboardAnalytics } from '@/lib/types';
import { logger } from '@/lib/logger';

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
  logger.info(
    'DASHBOARD_ANALYTICS',
    'Analytics data fetched successfully',
    {
      totalCalls: data.metrics?.totalCalls || 0,
      recentCallsCount: data.recentCalls?.length || 0,
    }
  );

  return data;
};

export function useDashboardAnalytics(
  options: UseDashboardAnalyticsOptions = {}
) {
  const { 
    days = 30, 
    limit = 100, 
    refetchInterval = 300000, // 5 minutes instead of 1 minute
    enabled = true 
  } = options;

  // Build the URL for SWR key
  const url = enabled 
    ? `/api/vapi/analytics?${new URLSearchParams({
        days: days.toString(),
        limit: limit.toString(),
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
    url, // SWR key - null when disabled
    analyticsFetcher,
    {
      // Stale-while-revalidate configuration
      refreshInterval: refetchInterval,
      revalidateOnFocus: false, // Disable aggressive focus revalidation
      revalidateOnReconnect: true, // Revalidate when connection is restored
      revalidateIfStale: true, // Use stale data while revalidating
      dedupingInterval: 30000, // Dedupe requests within 30 seconds
      
      // Cache configuration
      focusThrottleInterval: 60000, // Throttle focus revalidation to 1 minute
      
      // Error handling
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      
      // Performance optimizations
      keepPreviousData: true, // Keep previous data while loading new data
      
      onSuccess: (data) => {
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
      
      onError: (err) => {
        logger.error('DASHBOARD_ANALYTICS_SWR', 'SWR fetch error', err);
      },
    }
  );

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
