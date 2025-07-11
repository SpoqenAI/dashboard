import { memo, Suspense, lazy } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { formatDateDetailed, getSentimentBadge, getLeadQualityBadge, getStatusBadge } from './dashboard-helpers';
import { 
  Clock, 
  Phone, 
  DollarSign, 
  CheckSquare, 
  MessageSquare, 
  Volume2 
} from 'lucide-react';

// Lazy load heavy components for better performance
const CallRecordingPlayer = lazy(() => 
  import('@/components/call-recording-player').then(module => ({ default: module.CallRecordingPlayer }))
);
const CallTranscriptViewer = lazy(() => 
  import('@/components/call-transcript-viewer').then(module => ({ default: module.CallTranscriptViewer }))
);

// Define the call type interface
interface CallDetail {
  id: string;
  phoneNumber?: {
    number: string;
  };
  startedAt: string;
  endedAt?: string;
  endedReason: string;
  cost?: number;
  transcript?: string;
  recordingUrl?: string;
  analysis?: {
    sentiment?: string;
    leadQuality?: string;
    actionPoints?: string[];
  };
}

interface CallDetailModalProps {
  call: CallDetail | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CallDetailModal = memo(({ call, isOpen, onClose }: CallDetailModalProps) => {
  if (!call) return null;

  const duration = call.startedAt && call.endedAt
    ? Math.round((new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000)
    : 0;

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Call Details - {call.phoneNumber?.number || 'Unknown Number'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Call Overview Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Call Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Duration</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDuration(duration)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Cost</p>
                      <p className="text-sm text-muted-foreground">
                        ${call.cost?.toFixed(4) || '0.0000'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-1">Status</p>
                    {getStatusBadge(call.endedReason)}
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-1">Started</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateDetailed(call.startedAt)}
                    </p>
                  </div>
                </div>

                {call.analysis && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium mb-2">Sentiment</p>
                        {getSentimentBadge({ sentiment: call.analysis.sentiment })}
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">Lead Quality</p>
                        {getLeadQualityBadge({ leadQuality: call.analysis.leadQuality })}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Action Points Card */}
            {call.analysis?.actionPoints && call.analysis.actionPoints.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckSquare className="h-5 w-5" />
                    Action Points
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {call.analysis.actionPoints.map((point, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5 text-xs">
                          {index + 1}
                        </Badge>
                        <p className="text-sm flex-1">{point}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Call Recording */}
            {call.recordingUrl && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Volume2 className="h-5 w-5" />
                    Call Recording
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Suspense
                    fallback={
                      <Skeleton className="h-12 w-full rounded-md" />
                    }
                  >
                    <CallRecordingPlayer
                      callId={call.id}
                    />
                  </Suspense>
                </CardContent>
              </Card>
            )}

            {/* Call Transcript */}
            {call.transcript && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Call Transcript
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Suspense
                    fallback={
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    }
                  >
                    <CallTranscriptViewer
                      transcript={call.transcript}
                    />
                  </Suspense>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
});

CallDetailModal.displayName = 'CallDetailModal'; 