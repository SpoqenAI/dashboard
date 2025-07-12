import { memo, Suspense, lazy } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  formatDateDetailed,
  formatDuration,
  getSentimentBadge,
  getLeadQualityBadge,
} from './dashboard-helpers';
import { VapiCall } from '@/lib/types';
import {
  Clock,
  Phone,
  DollarSign,
  CheckSquare,
  MessageSquare,
  ListChecks,
  AlertTriangle,
  AlertCircle,
  Lightbulb,
  Smile,
  TrendingUp,
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

    // Full structured AI action points (if available)
    const ap = call.actionPoints;

    // Fallback flattened list for backward compatibility
    const keyPoints = ap?.keyPoints || call.analysis?.actionPoints || [];

    // Assign memoized component to capitalized variable for JSX usage
    const GetSentimentBadge = getSentimentBadge;
    const GetLeadQualityBadge = getLeadQualityBadge;

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
                    {call.status
                      ? call.status
                          .split('-')
                          .map(
                            word => word.charAt(0).toUpperCase() + word.slice(1)
                          )
                          .join(' ')
                      : 'Unknown'}
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
            {(ap || call.analysis?.sentiment || keyPoints.length > 0) && (
              <Card>
                <CardContent className="p-6">
                  <div className="mb-6 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">
                      AI-Generated Action Points
                    </h3>
                  </div>

                  <div className="space-y-6">
                    {/* Call Purpose */}
                    {ap?.callPurpose && (
                      <div>
                        <h4 className="mb-2 flex items-center gap-2 font-semibold">
                          <Lightbulb className="h-4 w-4" /> Call Purpose
                        </h4>
                        <p className="text-sm leading-relaxed">
                          {ap.callPurpose}
                        </p>
                      </div>
                    )}
                    {/* Call Sentiment */}
                    {(ap?.sentiment || call.analysis?.sentiment) && (
                      <div>
                        <h4 className="mb-2 flex items-center gap-2 font-semibold">
                          <Smile className="h-4 w-4" /> Call Sentiment
                        </h4>
                        <GetSentimentBadge
                          sentiment={
                            (ap?.sentiment || call.analysis?.sentiment) as any
                          }
                        />
                      </div>
                    )}

                    {/* Lead Quality */}
                    {(ap?.callAnalysis?.leadQuality || call.analysis?.leadQuality) && (
                      <div>
                        <h4 className="mb-2 flex items-center gap-2 font-semibold">
                          <TrendingUp className="h-4 w-4" /> Lead Quality
                        </h4>
                        <GetLeadQualityBadge
                          leadQuality={
                            (ap?.callAnalysis?.leadQuality || call.analysis?.leadQuality) as any
                          }
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
                    {ap?.followUpItems && ap.followUpItems.length > 0 && (
                      <div>
                        <div className="mb-3 flex items-center gap-2">
                          <ListChecks className="h-4 w-4 text-green-600" />
                          <h4 className="font-semibold">
                            Follow-up Actions ({ap.followUpItems.length})
                          </h4>
                        </div>
                        <div className="space-y-2">
                          {ap.followUpItems.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <CheckSquare className="mt-0.5 h-3 w-3 flex-shrink-0 text-green-600" />
                              <p className="text-sm">{item}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Urgent Concerns */}
                    {ap?.urgentConcerns && ap.urgentConcerns.length > 0 && (
                      <div>
                        <div className="mb-3 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <h4 className="font-semibold text-red-600">
                            Urgent Concerns ({ap.urgentConcerns.length})
                          </h4>
                        </div>
                        <div className="space-y-2">
                          {ap.urgentConcerns.map((concern, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-red-600" />
                              <p className="text-sm text-red-700 dark:text-red-400">
                                {concern}
                              </p>
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
