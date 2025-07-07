import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, PhoneCall, Mic, Play } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CallRecordingPlayer } from './call-recording-player';

interface RecentCall {
  id: number;
  name: string;
  phone: string;
  date: string;
  time: string;
  summary: string;
  hasRecording?: boolean;
}

export function RecentCallsList() {
  const [quickPlayCallId, setQuickPlayCallId] = useState<number | null>(null);

  const recentCalls: RecentCall[] = [
    {
      id: 1,
      name: 'Sarah Johnson',
      phone: '(555) 123-4567',
      date: 'May 24, 2025',
      time: '10:30 AM',
      summary:
        'Interested in the 3-bedroom property on Oak Street. First-time homebuyer.',
      hasRecording: true,
    },
    {
      id: 2,
      name: 'Michael Rodriguez',
      phone: '(555) 987-6543',
      date: 'May 23, 2025',
      time: '2:15 PM',
      summary: 'Looking to sell condo in downtown. Relocating for work.',
      hasRecording: true,
    },
    {
      id: 3,
      name: 'Emily Chen',
      phone: '(555) 456-7890',
      date: 'May 22, 2025',
      time: '4:45 PM',
      summary: 'Wants information about listings in Westside neighborhood.',
      hasRecording: false,
    },
  ];

  return (
    <>
      <div className="space-y-4">
        {recentCalls.map(call => (
          <div key={call.id} className="flex items-start space-x-4">
            <Avatar className="h-9 w-9">
              <AvatarFallback>{call.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium leading-none">{call.name}</p>
                <div className="flex items-center text-xs text-muted-foreground">
                  <PhoneCall className="mr-1 h-3 w-3" />
                  {call.phone}
                </div>
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                <Calendar className="mr-1 h-3 w-3" />
                {call.date}
                <Clock className="ml-2 mr-1 h-3 w-3" />
                {call.time}
                {call.hasRecording && (
                  <div className="ml-2 flex items-center gap-1 text-blue-600">
                    <Mic className="h-3 w-3" />
                    <span className="text-xs">Recording</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{call.summary}</p>
              {call.hasRecording && (
                <div className="mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700"
                    onClick={e => {
                      e.stopPropagation();
                      setQuickPlayCallId(call.id);
                    }}
                  >
                    <Play className="mr-1 h-3 w-3" />
                    Quick Play
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <Dialog open={quickPlayCallId !== null} onOpenChange={open => {
        if (!open) setQuickPlayCallId(null);
      }}>
        <DialogContent className="max-w-lg">
          {quickPlayCallId !== null && (
            <CallRecordingPlayer callId={quickPlayCallId.toString()} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
