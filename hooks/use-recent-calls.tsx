'use client';

import { useEffect, useState } from 'react';

export interface VapiCall {
  id: string;
  callerName?: string;
  phoneNumber?: string;
  startedAt?: string;
  summary?: string;
  transcript?: string;
}

interface UseRecentCallsOptions {
  limit?: number;
}

export function useRecentCalls(options: UseRecentCallsOptions = {}) {
  const [calls, setCalls] = useState<VapiCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchCalls = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (options.limit) params.set('limit', String(options.limit));

        const res = await fetch(`/api/vapi/recent-calls?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(
            `Request failed with ${res.status}: ${res.statusText}`
          );
        }

        const data = await res.json();

        // The API now returns an array directly, not an object with a calls property
        const callsArray = Array.isArray(data) ? data : [];
        setCalls(callsArray);
      } catch (err) {
        if (!controller.signal.aborted) {
          const errorMessage =
            err instanceof Error ? err.message : 'Unknown error occurred';
          setError(errorMessage);
          console.error('Failed to fetch recent calls:', err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchCalls();
    return () => controller.abort();
  }, [options.limit]);

  return { calls, loading, error };
}
