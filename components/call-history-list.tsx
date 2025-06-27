'use client';

import { useState } from 'react';
import { useRecentCalls } from '@/hooks/use-recent-calls';
import { useCallDetails } from '@/hooks/use-call-details';
import { useActionPointsManager } from '@/hooks/use-action-points-manager';
import { CallListItem } from '@/components/call-list-item';

export function CallHistoryList() {
  const { calls, loading, error } = useRecentCalls();
  const [selected, setSelected] = useState<string | null>(null);
  const {
    data: details,
    loading: detailsLoading,
    error: detailsError,
  } = useCallDetails(selected);
  const {
    actionPoints,
    actionPointsError,
    actionPointsLoading,
    handleGenerateActionPoints,
    clearActionPoints,
  } = useActionPointsManager();

  const handleToggleDetails = (callId: string) => {
    if (selected === callId) {
      setSelected(null);
      clearActionPoints(); // Clear action points when collapsing details
      } else {
      setSelected(callId);
      clearActionPoints(); // Clear action points when switching to a new call
    }
  };

  return (
    <div className="space-y-4">
      {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
      {error && <p className="text-sm text-red-600">Error: {error}</p>}
      {calls.map(call => (
        <CallListItem
          key={call.id}
          call={call}
          isSelected={selected === call.id}
          details={details}
          detailsLoading={detailsLoading}
          detailsError={detailsError}
          actionPoints={actionPoints}
          actionPointsError={actionPointsError}
          actionPointsLoading={actionPointsLoading}
          onToggleDetails={handleToggleDetails}
          onGenerateActionPoints={handleGenerateActionPoints}
        />
      ))}
    </div>
  );
}
