'use client';

import { useState } from 'react';
import {
  Calendar,
  Clock,
  PhoneCall,
  Lightbulb,
  ListTodo,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRecentCalls } from '@/hooks/use-recent-calls';
import { useCallDetails } from '@/hooks/use-call-details';
import { useActionPoints } from '@/hooks/use-action-points';
import { ActionPoints } from '@/lib/types';

export function CallHistoryList() {
  const { calls, loading, error } = useRecentCalls();
  const [selected, setSelected] = useState<string | null>(null);
  const [actionPoints, setActionPoints] = useState<ActionPoints | null>(null);
  const [actionPointsError, setActionPointsError] = useState<string | null>(
    null
  );
  const {
    data: details,
    loading: detailsLoading,
    error: detailsError,
  } = useCallDetails(selected);
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
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {details.call.analysis.summary}
                      </p>

                      {/* Action Points Button */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerateActionPoints(call.id)}
                          disabled={actionPointsLoading}
                          className="text-xs"
                        >
                          <Lightbulb className="mr-1 h-3 w-3" />
                          {actionPointsLoading
                            ? 'Analyzing...'
                            : 'Get Action Points'}
                        </Button>
                      </div>

                      {/* Action Points Error Display */}
                      {actionPointsError && (
                        <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2">
                          <p className="flex items-start gap-1 text-xs text-red-700">
                            <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0 text-red-500" />
                            {actionPointsError}
                          </p>
                        </div>
                      )}

                      {/* Action Points Display */}
                      {actionPoints && (
                        <div className="mt-3 space-y-2 rounded-lg bg-muted p-3">
                          <h4 className="flex items-center gap-1 text-sm font-semibold">
                            <Lightbulb className="h-3 w-3" />
                            Action Points
                          </h4>

                          {actionPoints.callPurpose && (
                            <div>
                              <Badge variant="outline" className="text-xs">
                                {actionPoints.callPurpose}
                              </Badge>
                            </div>
                          )}

                          {actionPoints.keyPoints &&
                            actionPoints.keyPoints.length > 0 && (
                              <div>
                                <p className="mb-1 text-xs font-medium text-muted-foreground">
                                  Key Points ({actionPoints.keyPoints.length})
                                </p>
                                <ul className="space-y-1 text-xs">
                                  {actionPoints.keyPoints
                                    .slice(0, 3)
                                    .map((point: string, index: number) => (
                                      <li
                                        key={index}
                                        className="flex items-start gap-1"
                                      >
                                        <span className="mt-1.5 inline-block h-1 w-1 flex-shrink-0 rounded-full bg-blue-500"></span>
                                        <span className="text-muted-foreground">
                                          {point}
                                        </span>
                                      </li>
                                    ))}
                                  {actionPoints.keyPoints.length > 3 && (
                                    <li className="text-xs italic text-muted-foreground">
                                      +{actionPoints.keyPoints.length - 3}{' '}
                                      more...
                                    </li>
                                  )}
                                </ul>
                              </div>
                            )}

                          {actionPoints.followUpItems &&
                            actionPoints.followUpItems.length > 0 && (
                              <div>
                                <p className="mb-1 flex items-center gap-1 text-xs font-medium text-green-700">
                                  <ListTodo className="h-3 w-3" />
                                  Follow-ups (
                                  {actionPoints.followUpItems.length})
                                </p>
                                <ul className="space-y-1 text-xs">
                                  {actionPoints.followUpItems
                                    .slice(0, 2)
                                    .map((item: string, index: number) => (
                                      <li
                                        key={index}
                                        className="flex items-start gap-1"
                                      >
                                        <span className="mt-1.5 inline-block h-1 w-1 flex-shrink-0 rounded-full bg-green-500"></span>
                                        <span className="text-muted-foreground">
                                          {item}
                                        </span>
                                      </li>
                                    ))}
                                  {actionPoints.followUpItems.length > 2 && (
                                    <li className="text-xs italic text-muted-foreground">
                                      +{actionPoints.followUpItems.length - 2}{' '}
                                      more...
                                    </li>
                                  )}
                                </ul>
                              </div>
                            )}

                          {actionPoints.urgentConcerns &&
                            actionPoints.urgentConcerns.length > 0 && (
                              <div>
                                <p className="mb-1 flex items-center gap-1 text-xs font-medium text-red-700">
                                  <AlertTriangle className="h-3 w-3" />
                                  Urgent ({actionPoints.urgentConcerns.length})
                                </p>
                                <ul className="space-y-1 text-xs">
                                  {actionPoints.urgentConcerns.map(
                                    (concern: string, index: number) => (
                                      <li
                                        key={index}
                                        className="flex items-start gap-1"
                                      >
                                        <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0 text-red-500" />
                                        <span className="text-red-700">
                                          {concern}
                                        </span>
                                      </li>
                                    )
                                  )}
                                </ul>
                              </div>
                            )}
                        </div>
                      )}
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
                            <div className="text-muted-foreground">
                              Available
                            </div>
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
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
