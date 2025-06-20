'use client';

import { useState } from 'react';
import { Calendar, Clock, PhoneCall } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRecentCalls } from '@/hooks/use-recent-calls';
import { useCallDetails } from '@/hooks/use-call-details';

export function CallHistoryList() {
  const { calls, loading, error } = useRecentCalls();
  const [selected, setSelected] = useState<string | null>(null);
  const {
    data: details,
    loading: detailsLoading,
    error: detailsError,
  } = useCallDetails(selected);

  return (
    <div className="space-y-4">
      {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
      {error && <p className="text-sm text-red-600">Error: {error}</p>}
      {calls.map(call => (
        <div key={call.id} className="space-y-2 rounded-md border p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{call.callerName || 'Unknown'}</div>
              <div className="flex items-center text-sm text-muted-foreground">
                <PhoneCall className="mr-1 h-3 w-3" />
                {call.phoneNumber || 'Unknown'}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelected(selected === call.id ? null : call.id)}
            >
              {selected === call.id ? 'Hide Details' : 'View Details'}
            </Button>
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            <Calendar className="mr-1 h-3 w-3" />
            {call.startedAt
              ? new Date(call.startedAt).toLocaleDateString()
              : ''}
            <Clock className="ml-2 mr-1 h-3 w-3" />
            {call.startedAt
              ? new Date(call.startedAt).toLocaleTimeString()
              : ''}
          </div>
          {selected === call.id && (
            <div className="mt-2 space-y-2">
              {detailsLoading && (
                <p className="text-sm text-muted-foreground">Loading...</p>
              )}
              {detailsError && (
                <p className="text-sm text-red-600">Error: {detailsError}</p>
              )}
              {details && (
                <>
                  {details.call?.analysis?.summary && (
                    <p className="text-sm text-muted-foreground">
                      {details.call.analysis.summary}
                    </p>
                  )}
                  {details.analytics && (
                    <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
                      {JSON.stringify(details.analytics, null, 2)}
                    </pre>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
