'use client';

import { Calendar, Clock, PhoneCall } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CallDetails } from '@/components/call-details';
import { ActionPoints } from '@/lib/types';

interface Call {
  id: string;
  callerName?: string;
  phoneNumber?: string;
  startedAt?: string;
}

interface CallListItemProps {
  call: Call;
  isSelected: boolean;
  details: any;
  detailsLoading: boolean;
  detailsError: string | null;
  actionPoints: ActionPoints | null;
  actionPointsError: string | null;
  actionPointsLoading: boolean;
  onToggleDetails: (callId: string) => void;
  onGenerateActionPoints: (callId: string) => void;
}

export function CallListItem({
  call,
  isSelected,
  details,
  detailsLoading,
  detailsError,
  actionPoints,
  actionPointsError,
  actionPointsLoading,
  onToggleDetails,
  onGenerateActionPoints,
}: CallListItemProps) {
  return (
    <div className="space-y-2 rounded-md border p-4">
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
          onClick={() => onToggleDetails(call.id)}
        >
          {isSelected ? 'Hide Details' : 'View Details'}
        </Button>
      </div>
      
      <div className="flex items-center text-xs text-muted-foreground">
        <Calendar className="mr-1 h-3 w-3" />
        {call.startedAt ? new Date(call.startedAt).toLocaleDateString() : ''}
        <Clock className="ml-2 mr-1 h-3 w-3" />
        {call.startedAt ? new Date(call.startedAt).toLocaleTimeString() : ''}
      </div>

      {isSelected && (
        <div className="mt-2 space-y-2">
          <CallDetails
            callId={call.id}
            details={details}
            detailsLoading={detailsLoading}
            detailsError={detailsError}
            actionPoints={actionPoints}
            actionPointsError={actionPointsError}
            actionPointsLoading={actionPointsLoading}
            onGenerateActionPoints={onGenerateActionPoints}
          />
        </div>
      )}
    </div>
  );
} 