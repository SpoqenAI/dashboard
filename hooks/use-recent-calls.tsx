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

interface RecentCallsApiResponse {
  calls: RecentCall[];
  totalCount?: number;
  hasMore?: boolean;
}

interface UseRecentCallsOptions {
  limit?: number;
}

// Type guard to validate RecentCall object
function isValidRecentCall(obj: any): obj is RecentCall {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.status === 'string' &&
    typeof obj.endedReason === 'string' &&
    typeof obj.durationSeconds === 'number' &&
    typeof obj.createdAt === 'string' &&
    (obj.callerName === undefined || typeof obj.callerName === 'string') &&
    (obj.phoneNumber === undefined || typeof obj.phoneNumber === 'string') &&
    (obj.startedAt === undefined || typeof obj.startedAt === 'string') &&
    (obj.summary === undefined || typeof obj.summary === 'string') &&
    (obj.transcript === undefined || typeof obj.transcript === 'string') &&
    (obj.endedAt === undefined || typeof obj.endedAt === 'string') &&
    (obj.cost === undefined || typeof obj.cost === 'number')
  );
}

// Type guard to validate API response structure
function isValidRecentCallsResponse(data: any): data is RecentCallsApiResponse {
  return (
    data &&
    typeof data === 'object' &&
    Array.isArray(data.calls) &&
    data.calls.every(isValidRecentCall) &&
    (data.totalCount === undefined || typeof data.totalCount === 'number') &&
    (data.hasMore === undefined || typeof data.hasMore === 'boolean')
  );
}

// Validation function that throws descriptive errors
function validateRecentCallsResponse(data: any): RecentCallsApiResponse {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response: expected object');
  }

  if (!Array.isArray(data.calls)) {
    throw new Error('Invalid response: missing or invalid calls array');
  }

  // Validate each call in the array
  for (let i = 0; i < data.calls.length; i++) {
    const call = data.calls[i];
    if (!isValidRecentCall(call)) {
      throw new Error(
        `Invalid call data at index ${i}: missing required fields or invalid types`
      );
    }
  }

  if (data.totalCount !== undefined && typeof data.totalCount !== 'number') {
    throw new Error('Invalid response: totalCount must be a number');
  }

  if (data.hasMore !== undefined && typeof data.hasMore !== 'boolean') {
    throw new Error('Invalid response: hasMore must be a boolean');
  }

  return data as RecentCallsApiResponse;
}

// Function to fetch recent calls from the API
const fetchRecentCalls = async (
  limit?: number
): Promise<RecentCallsApiResponse> => {
  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));

  const res = await fetch(`/api/vapi/recent-calls?${params.toString()}`);

  if (!res.ok) {
    throw new Error(`Request failed with ${res.status}: ${res.statusText}`);
  }

  const rawData = await res.json();

  // Validate the response data before returning
  try {
    const validatedData = validateRecentCallsResponse(rawData);
    return validatedData;
  } catch (validationError) {
    throw new Error(
      `API response validation failed: ${validationError instanceof Error ? validationError.message : 'Unknown validation error'}`
    );
  }
};

export function useRecentCalls(options: UseRecentCallsOptions = {}) {
  const { data, isLoading, error, refetch } = useQuery<RecentCallsApiResponse>({
    queryKey: ['recent-calls', options.limit],
    queryFn: () => fetchRecentCalls(options.limit),
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Extract calls from the validated API response
  const calls: RecentCall[] = data?.calls || [];

  return {
    calls,
    loading: isLoading, // Keep backward compatibility
    isLoading,
    error: error?.message || null,
    refetch,
    isSuccess: !!data,
    isError: !!error,
    totalCount: data?.totalCount,
    hasMore: data?.hasMore,
  };
}
