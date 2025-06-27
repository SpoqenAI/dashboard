'use client';

import { useQuery } from '@tanstack/react-query';

export interface RecentCall {
  id: string;
  callerName?: string;
  phoneNumber?: string;
  startedAt?: string;
  summary?: string;
  transcript?: string;
  status: string;
  endedReason: string;
  durationSeconds: number;
  createdAt: string;
  endedAt?: string;
  cost?: number;
}

interface UseRecentCallsOptions {
  limit?: number;
}

// Function to fetch recent calls from the API
const fetchRecentCalls = async (limit?: number) => {
  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));

  const res = await fetch(`/api/vapi/recent-calls?${params.toString()}`);

  if (!res.ok) {
    throw new Error(`Request failed with ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  return data;
};

export function useRecentCalls(options: UseRecentCallsOptions = {}) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['recent-calls', options.limit],
    queryFn: () => fetchRecentCalls(options.limit),
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Extract calls from the API response
  const calls: RecentCall[] = data?.calls || [];

  return {
    calls,
    loading: isLoading, // Keep backward compatibility
    isLoading,
    error: error?.message || null,
    refetch,
    isSuccess: !!data,
    isError: !!error,
  };
}
