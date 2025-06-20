'use client';

import { useEffect, useState } from 'react';
import type { DashboardMetrics } from '@/lib/vapi/getDashboardMetrics';

// Helper function to validate ISO date strings
function isValidISODate(dateString: string): boolean {
  if (!dateString || typeof dateString !== 'string') {
    return false;
  }

  // Check if the string matches the ISO date format pattern
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  if (!isoDateRegex.test(dateString)) {
    return false;
  }

  // Check if the date is actually valid
  const date = new Date(dateString);
  return (
    !isNaN(date.getTime()) &&
    date.toISOString() === dateString.replace(/Z?$/, 'Z')
  );
}

export function useDashboardMetrics(fromISO: string, toISO: string) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchMetrics = async () => {
      // Reset error state at the beginning of each fetch
      setError(null);

      try {
        // Validate ISO date strings before making the fetch
        if (!isValidISODate(fromISO)) {
          throw new Error(
            'Invalid fromISO date format. Expected ISO date string.'
          );
        }
        if (!isValidISODate(toISO)) {
          throw new Error(
            'Invalid toISO date format. Expected ISO date string.'
          );
        }

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
