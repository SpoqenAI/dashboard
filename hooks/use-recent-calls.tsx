import { useEffect, useState } from 'react';

export interface CallRecord {
  id: string;
  [key: string]: any;
}

export function useRecentCalls(limit = 5) {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCalls() {
      setLoading(true);
      try {
        const res = await fetch(`/api/vapi/recent-calls`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit }),
        });
        if (!res.ok) {
          throw new Error(`Request failed with ${res.status}`);
        }
        const data = await res.json();
        setCalls(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch');
      } finally {
        setLoading(false);
      }
    }
    fetchCalls();
  }, [limit]);

  return { calls, loading, error };
}
