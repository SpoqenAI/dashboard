import { memo, Suspense, lazy } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  formatDateDetailed,
  getSentimentBadge as GetSentimentBadge,
} from './dashboard-helpers';
import { VapiCall } from '@/lib/types';
import {
  Clock,
  Phone,
  DollarSign,
  CheckSquare,
  MessageSquare,
} from 'lucide-react';

// Lazy load heavy components for better performance
const CallRecordingPlayer = lazy(() =>
  import('@/components/call-recording-player').then(module => ({
    default: module.CallRecordingPlayer,
  }))
);
const CallTranscriptViewer = lazy(() =>
  import('@/components/call-transcript-viewer').then(module => ({
    default: module.CallTranscriptViewer,
  }))
);

interface CallDetailModalProps {
  call: VapiCall | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CallDetailModal = memo(
  ({ call, isOpen, onClose }: CallDetailModalProps) => {
    if (!call) return null;

    const duration =
      call.durationSeconds ||
      (call.startedAt && call.endedAt
        ? Math.round(
            (new Date(call.endedAt).getTime() -
              new Date(call.startedAt).getTime()) /
              1000
          )
        : 0);

    const formatDuration = (seconds: number): string => {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // Parse key points, follow-up items, and urgent concerns from action points
    // Note: VapiCall analysis doesn't have structured keyPoints, followUpItems, urgentConcerns
    const structuredKeyPoints: string[] = [];
    const followUpItems: string[] = [];
    const urgentConcerns: string[] = [];

    // If no structured data, try to parse from actionPoints array
    const allActionPoints = call.analysis?.actionPoints || [];
    const keyPoints =
      structuredKeyPoints.length > 0
        ? structuredKeyPoints
        : followUpItems.length === 0 && allActionPoints.length > 0
          ? allActionPoints
          : structuredKeyPoints;

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-y-auto">
          <div className="mb-6 flex flex-col space-y-1.5 text-left">
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Call Details -{' '}
              {call.callerName || call.phoneNumber?.number || 'Unknown'}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {call.startedAt
                ? formatDateDetailed(call.startedAt)
                : 'Unknown date'}{' '}
              • {formatDuration(duration)}
            </p>
          </div>

          <div className="flex-1 space-y-6">
            {/* Summary Cards Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Duration Card */}
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <Clock className="mb-2 h-8 w-8 text-blue-500" />
                  <div className="text-2xl font-bold">
                    {formatDuration(duration)}
                  </div>
                  <div className="text-sm text-muted-foreground">Duration</div>
                </CardContent>
              </Card>

              {/* Call Status Card */}
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <CheckSquare className="mb-2 h-8 w-8 text-green-500" />
                  <div className="text-lg font-semibold text-green-600">
                    Completed
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Call Status
                  </div>
                </CardContent>
              </Card>

              {/* Phone Number Card */}
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <Phone className="mb-2 h-8 w-8 text-green-500" />
                  <div className="text-lg font-semibold">
                    {call.phoneNumber?.number || 'Unknown'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Phone Number
                  </div>
                </CardContent>
              </Card>

              {/* Cost Card */}
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <DollarSign className="mb-2 h-8 w-8 text-purple-500" />
                  <div className="text-2xl font-bold">
                    ${call.cost?.toFixed(3) || '0.000'}
                  </div>
                  <div className="text-sm text-muted-foreground">Cost</div>
                </CardContent>
              </Card>
            </div>

            {/* Call Recording */}
            {call.recordingUrl && (
              <Suspense
                fallback={<Skeleton className="h-12 w-full rounded-md" />}
              >
                <CallRecordingPlayer callId={call.id} />
              </Suspense>
            )}

            {/* Call Summary */}
            {call.summary && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="mb-4 text-lg font-semibold">Call Summary</h3>
                  <p className="text-sm leading-relaxed">{call.summary}</p>
                </CardContent>
              </Card>
            )}

            {/* AI-Generated Action Points */}
            {(call.analysis?.sentiment ||
              keyPoints.length > 0 ||
              followUpItems.length > 0) && (
              <Card>
                <CardContent className="p-6">
                  <div className="mb-6 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">
                      AI-Generated Action Points
                    </h3>
                  </div>

                  <div className="space-y-6">
                    {/* Call Sentiment */}
                    {call.analysis?.sentiment && (
                      <div>
                        <h4 className="mb-2 font-semibold">Call Sentiment</h4>
                        <GetSentimentBadge
                          sentiment={call.analysis.sentiment}
                        />
                      </div>
                    )}

                    {/* Key Discussion Points */}
                    {keyPoints.length > 0 && (
                      <div>
                        <div className="mb-3 flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          <h4 className="font-semibold">
                            Key Discussion Points ({keyPoints.length})
                          </h4>
                        </div>
                        <div className="space-y-2">
                          {keyPoints.map((point, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                              <p className="text-sm">{point}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Follow-up Actions */}
                    {followUpItems.length > 0 && (
                      <div>
                        <div className="mb-3 flex items-center gap-2">
                          <CheckSquare className="h-4 w-4 text-green-600" />
                          <h4 className="font-semibold text-green-700">
                            Follow-up Actions ({followUpItems.length})
                          </h4>
                        </div>
                        <div className="space-y-2">
                          {followUpItems.map((item, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <CheckSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                              <p className="text-sm">{item}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Urgent Concerns */}
                    {urgentConcerns.length > 0 && (
                      <div>
                        <div className="mb-3 flex items-center gap-2">
                          <Badge variant="destructive" className="text-xs">
                            !
                          </Badge>
                          <h4 className="font-semibold text-red-700">
                            Urgent Concerns ({urgentConcerns.length})
                          </h4>
                        </div>
                        <div className="space-y-2">
                          {urgentConcerns.map((concern, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-red-500" />
                              <p className="text-sm text-red-700">{concern}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Call Transcript */}
            {call.transcript && (
              <Suspense
                fallback={
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                }
              >
                <CallTranscriptViewer transcript={call.transcript} />
              </Suspense>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }
);

CallDetailModal.displayName = 'CallDetailModal';
