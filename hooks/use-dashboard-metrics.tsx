'use client';

import { useEffect, useState } from 'react';
import type { DashboardMetrics } from '@/lib/vapi/getDashboardMetrics';

export function useDashboardMetrics(fromISO: string, toISO: string) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchMetrics = async () => {
      try {
        const params = new URLSearchParams({ from: fromISO, to: toISO });
        const res = await fetch(`/api/vapi/dashboard-metrics?${params}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`Request failed with ${res.status}`);
        }
        const data = await res.json();
        setMetrics(data.metrics ?? data);
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

    fetchMetrics();
    return () => controller.abort();
  }, [fromISO, toISO]);

  return { metrics, loading, error };
}
