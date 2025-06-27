'use client';

import { Lightbulb, ListTodo, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ActionPoints } from '@/lib/types';

interface ActionPointsDisplayProps {
  callId: string;
  actionPoints: ActionPoints | null;
  actionPointsError: string | null;
  actionPointsLoading: boolean;
  onGenerateActionPoints: (callId: string) => void;
}

export function ActionPointsDisplay({
  callId,
  actionPoints,
  actionPointsError,
  actionPointsLoading,
  onGenerateActionPoints,
}: ActionPointsDisplayProps) {
  return (
    <>
      {/* Action Points Button */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onGenerateActionPoints(callId)}
          disabled={actionPointsLoading}
          className="text-xs"
        >
          <Lightbulb className="mr-1 h-3 w-3" />
          {actionPointsLoading ? 'Analyzing...' : 'Get Action Points'}
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

          {actionPoints.keyPoints && actionPoints.keyPoints.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Key Points ({actionPoints.keyPoints.length})
              </p>
              <ul className="space-y-1 text-xs">
                {actionPoints.keyPoints
                  .slice(0, 3)
                  .map((point: string, index: number) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="mt-1.5 inline-block h-1 w-1 flex-shrink-0 rounded-full bg-blue-500"></span>
                      <span className="text-muted-foreground">{point}</span>
                    </li>
                  ))}
                {actionPoints.keyPoints.length > 3 && (
                  <li className="text-xs italic text-muted-foreground">
                    +{actionPoints.keyPoints.length - 3} more...
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
                  Follow-ups ({actionPoints.followUpItems.length})
                </p>
                <ul className="space-y-1 text-xs">
                  {actionPoints.followUpItems
                    .slice(0, 2)
                    .map((item: string, index: number) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="mt-1.5 inline-block h-1 w-1 flex-shrink-0 rounded-full bg-green-500"></span>
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  {actionPoints.followUpItems.length > 2 && (
                    <li className="text-xs italic text-muted-foreground">
                      +{actionPoints.followUpItems.length - 2} more...
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
                      <li key={index} className="flex items-start gap-1">
                        <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0 text-red-500" />
                        <span className="text-red-700">{concern}</span>
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}
        </div>
      )}
    </>
  );
}
