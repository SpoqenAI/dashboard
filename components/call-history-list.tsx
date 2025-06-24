'use client';

import { useState } from 'react';
import { Calendar, Clock, PhoneCall, Lightbulb, ListTodo, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRecentCalls } from '@/hooks/use-recent-calls';
import { useCallDetails } from '@/hooks/use-call-details';
import { useActionPoints } from '@/hooks/use-action-points';

export function CallHistoryList() {
  const { calls, loading, error } = useRecentCalls();
  const [selected, setSelected] = useState<string | null>(null);
  const [actionPoints, setActionPoints] = useState<any>(null);
  const {
    data: details,
    loading: detailsLoading,
    error: detailsError,
  } = useCallDetails(selected);
  const { generateActionPoints, loading: actionPointsLoading } = useActionPoints();

  const handleGenerateActionPoints = async (callId: string) => {
    const points = await generateActionPoints(callId);
    if (points) {
      setActionPoints(points);
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
                          <Lightbulb className="w-3 h-3 mr-1" />
                          {actionPointsLoading ? 'Analyzing...' : 'Get Action Points'}
                        </Button>
                      </div>

                      {/* Action Points Display */}
                      {actionPoints && (
                        <div className="mt-3 space-y-2 p-3 bg-muted rounded-lg">
                          <h4 className="text-sm font-semibold flex items-center gap-1">
                            <Lightbulb className="w-3 h-3" />
                            Action Points
                          </h4>
                          
                          {actionPoints.callPurpose && (
                            <div>
                              <Badge variant="outline" className="text-xs">
                                {actionPoints.callPurpose}
                              </Badge>
                            </div>
                          )}

                          {actionPoints.keyPoints && actionPoints.keyPoints.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                Key Points ({actionPoints.keyPoints.length})
                              </p>
                              <ul className="text-xs space-y-1">
                                {actionPoints.keyPoints.slice(0, 3).map((point: string, index: number) => (
                                  <li key={index} className="flex items-start gap-1">
                                    <span className="inline-block w-1 h-1 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>
                                    <span className="text-muted-foreground">{point}</span>
                                  </li>
                                ))}
                                {actionPoints.keyPoints.length > 3 && (
                                  <li className="text-xs text-muted-foreground italic">
                                    +{actionPoints.keyPoints.length - 3} more...
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}

                          {actionPoints.followUpItems && actionPoints.followUpItems.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-green-700 mb-1 flex items-center gap-1">
                                <ListTodo className="w-3 h-3" />
                                Follow-ups ({actionPoints.followUpItems.length})
                              </p>
                              <ul className="text-xs space-y-1">
                                {actionPoints.followUpItems.slice(0, 2).map((item: string, index: number) => (
                                  <li key={index} className="flex items-start gap-1">
                                    <span className="inline-block w-1 h-1 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></span>
                                    <span className="text-muted-foreground">{item}</span>
                                  </li>
                                ))}
                                {actionPoints.followUpItems.length > 2 && (
                                  <li className="text-xs text-muted-foreground italic">
                                    +{actionPoints.followUpItems.length - 2} more...
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}

                          {actionPoints.urgentConcerns && actionPoints.urgentConcerns.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-red-700 mb-1 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Urgent ({actionPoints.urgentConcerns.length})
                              </p>
                              <ul className="text-xs space-y-1">
                                {actionPoints.urgentConcerns.map((concern: string, index: number) => (
                                  <li key={index} className="flex items-start gap-1">
                                    <AlertTriangle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-red-700">{concern}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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
