import { useState } from 'react';
import { ActionPoints } from '@/lib/types';
import { logger } from '@/lib/logger';

export function useActionPoints() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateActionPoints = async (
    callId: string
  ): Promise<ActionPoints | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/vapi/action-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ callId }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to generate action points: ${response.statusText}`
        );
      }

      const data = await response.json();
      logger.info('ACTION_POINTS', 'Successfully generated action points', {
        callId,
      });
      return data.actionPoints;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      logger.error(
        'ACTION_POINTS',
        'Failed to generate action points',
        err as Error,
        { callId }
      );
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
