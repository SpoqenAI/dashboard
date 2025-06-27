'use client';

import { useActionPoints } from '@/hooks/use-action-points';

export function useActionPointsManager() {
  const {
    generateActionPoints,
    loading: actionPointsLoading,
    data: actionPoints,
    error,
    reset,
  } = useActionPoints();

  const handleGenerateActionPoints = async (callId: string) => {
    // Clear any previous state before generating new action points
    reset();

    try {
      await generateActionPoints(callId);
      // State is automatically managed by useActionPoints via React Query
    } catch (error) {
      // Error handling is already managed by useActionPoints
      console.error('Failed to generate action points:', error);
    }
  };

  const clearActionPoints = () => {
    // Reset the mutation state, clearing data and errors
    reset();
  };

  return {
    actionPoints,
    actionPointsError: error,
    actionPointsLoading,
    handleGenerateActionPoints,
    clearActionPoints,
  };
}
