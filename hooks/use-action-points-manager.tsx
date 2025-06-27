'use client';

import { useState } from 'react';
import { useActionPoints } from '@/hooks/use-action-points';
import { ActionPoints } from '@/lib/types';

export function useActionPointsManager() {
  const [actionPoints, setActionPoints] = useState<ActionPoints | null>(null);
  const [actionPointsError, setActionPointsError] = useState<string | null>(
    null
  );
  const { generateActionPoints, loading: actionPointsLoading } =
    useActionPoints();

  const handleGenerateActionPoints = async (callId: string) => {
    try {
      // Clear any previous errors
      setActionPointsError(null);
      setActionPoints(null);

      const points = await generateActionPoints(callId);
      if (points) {
        setActionPoints(points);
      } else {
        setActionPointsError(
          'No action points could be generated for this call.'
        );
      }
    } catch (error) {
      console.error('Failed to generate action points:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to generate action points. Please try again.';
      setActionPointsError(errorMessage);
    }
  };

  const clearActionPoints = () => {
    setActionPoints(null);
    setActionPointsError(null);
  };

  return {
    actionPoints,
    actionPointsError,
    actionPointsLoading,
    handleGenerateActionPoints,
    clearActionPoints,
  };
}
