'use client';

import { useMutation } from '@tanstack/react-query';
import { ActionPoints } from '@/lib/types';

// Function to generate action points for a specific call
const generateActionPointsAPI = async (
  callId: string
): Promise<ActionPoints> => {
  const response = await fetch(`/api/vapi/calls/${callId}/action-points`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: 'Unknown error' }));
    throw new Error(
      errorData.error || `Request failed with status ${response.status}`
    );
  }

  const data = await response.json();
  return data.actionPoints;
};

export function useActionPoints() {
  const mutation = useMutation({
    mutationFn: generateActionPointsAPI,
    onError: error => {
      console.error('Failed to generate action points:', error);
    },
  });

  // Maintain backward compatibility by wrapping mutateAsync
  const generateActionPoints = async (
    callId: string
  ): Promise<ActionPoints | null> => {
    try {
      const result = await mutation.mutateAsync(callId);
      return result;
    } catch (error) {
      // Error is already handled by useMutation
      return null;
    }
  };

  return {
    generateActionPoints,
    generateActionPointsAsync: mutation.mutateAsync,
    loading: mutation.isPending, // Keep backward compatibility
    isLoading: mutation.isPending,
    error: mutation.error?.message || null,
    data: mutation.data,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    reset: mutation.reset,
  };
}
