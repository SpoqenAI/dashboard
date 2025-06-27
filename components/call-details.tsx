'use client';

import { ActionPointsDisplay } from '@/components/action-points-display';
import { ActionPoints } from '@/lib/types';

interface CallDetailsProps {
  callId: string;
  details: any;
  detailsLoading: boolean;
  detailsError: string | null;
  actionPoints: ActionPoints | null;
  actionPointsError: string | null;
  actionPointsLoading: boolean;
  onGenerateActionPoints: (callId: string) => void;
}

export function CallDetails({
  callId,
  details,
  detailsLoading,
  detailsError,
  actionPoints,
  actionPointsError,
  actionPointsLoading,
  onGenerateActionPoints,
}: CallDetailsProps) {
  if (detailsLoading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  if (detailsError) {
    return <p className="text-sm text-red-600">Error: {detailsError}</p>;
  }

  if (!details) {
    return null;
  }

  return (
    <>
      {details.call?.analysis?.summary && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {details.call.analysis.summary}
          </p>

          <ActionPointsDisplay
            callId={callId}
            actionPoints={actionPoints}
            actionPointsError={actionPointsError}
            actionPointsLoading={actionPointsLoading}
            onGenerateActionPoints={onGenerateActionPoints}
          />
        </div>
      )}

      {/* Analytics Section - User-friendly display */}
      {details.analytics && (
        <div className="mt-3 space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">
            Call Analytics
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {(details.analytics as any)?.duration && (
              <div className="rounded-md bg-muted p-2">
                <div className="font-medium">Duration</div>
                <div className="text-muted-foreground">
                  {Math.round((details.analytics as any).duration / 60)} min
                </div>
              </div>
            )}
            {(details.analytics as any)?.cost && (
              <div className="rounded-md bg-muted p-2">
                <div className="font-medium">Cost</div>
                <div className="text-muted-foreground">
                  ${(details.analytics as any).cost?.toFixed(4) || '0.00'}
                </div>
              </div>
            )}
            {(details.analytics as any)?.endedReason && (
              <div className="rounded-md bg-muted p-2">
                <div className="font-medium">End Reason</div>
                <div className="text-muted-foreground">
                  {(details.analytics as any).endedReason}
                </div>
              </div>
            )}
            {(details.analytics as any)?.recordingUrl && (
              <div className="rounded-md bg-muted p-2">
                <div className="font-medium">Recording</div>
                <div className="text-muted-foreground">Available</div>
              </div>
            )}
          </div>

          {/* Debug raw JSON - only in development */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                Debug: Raw Analytics Data
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-slate-50 p-2 text-xs text-muted-foreground">
                {JSON.stringify(details.analytics, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </>
  );
} 