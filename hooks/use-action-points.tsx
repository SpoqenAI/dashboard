'use client';

import { useState } from 'react';
import { ActionPoints } from '@/lib/types';

export function useActionPoints() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateActionPoints = async (callId: string): Promise<ActionPoints | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/vapi/calls/${callId}/action-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      return data.actionPoints;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate action points';
      setError(errorMessage);
      console.error('Failed to generate action points:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    generateActionPoints,
    loading,
    error,
  };
}