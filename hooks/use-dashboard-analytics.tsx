import { useState, useEffect, useCallback } from 'react';
import { DashboardAnalytics } from '@/lib/types';
import { logger } from '@/lib/logger';

interface UseDashboardAnalyticsOptions {
  days?: number;
  limit?: number;
  refetchInterval?: number;
}

export function useDashboardAnalytics(options: UseDashboardAnalyticsOptions = {}) {
  const { days = 30, limit = 100, refetchInterval = 60000 } = options; // Default 1 minute refetch

  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAnalytics = useCallback(async (isRefetch = false) => {
    if (isRefetch) {
      setIsRefetching(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams({
        days: days.toString(),
        limit: limit.toString(),
      });

      const response = await fetch(`/api/vapi/analytics?${params}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error('DASHBOARD_ANALYTICS', 'Failed to fetch analytics', new Error(errorText));
        throw new Error(`Failed to fetch analytics: ${response.statusText}`);
      }

      const data = await response.json();
      logger.info('DASHBOARD_ANALYTICS', 'Analytics data fetched successfully', {
        totalCalls: data.metrics?.totalCalls || 0,
        timeRange: `${days} days`,
      });

      setAnalytics(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      logger.error('DASHBOARD_ANALYTICS', 'Failed to fetch analytics', error);
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  }, [days, limit]);

  const refetch = useCallback(() => {
    return fetchAnalytics(true);
  }, [fetchAnalytics]);

  // Initial fetch
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Set up refetch interval
  useEffect(() => {
    if (refetchInterval > 0) {
      const interval = setInterval(() => {
        fetchAnalytics(true);
      }, refetchInterval);

      return () => clearInterval(interval);
    }
  }, [fetchAnalytics, refetchInterval]);

  // Refetch on window focus
  useEffect(() => {
    const handleFocus = () => {
      fetchAnalytics(true);
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchAnalytics]);

  return {
    analytics,
    isLoading,
    error,
    refetch,
    isRefetching,
  };
} 