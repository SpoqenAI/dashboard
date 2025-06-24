'use client';

import { useEffect, useState } from 'react';

export interface CallAnalysis {
  summary?: string;
  keyPoints?: string[];
  followUpItems?: string[];
  urgentConcerns?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  callPurpose?: string;
}

export interface CallData {
  analysis?: CallAnalysis;
  [key: string]: unknown;
}

export interface CallDetailsData {
  call?: CallData;
  analytics?: unknown;
}

export function useCallDetails(callId: string | null) {
  const [data, setData] = useState<CallDetailsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!callId) return;
    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/vapi/calls/${callId}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`Request failed with ${res.status}`);
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError((err as Error).message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => controller.abort();
  }, [callId]);

  return { data, loading, error };
}
