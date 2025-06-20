import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, Clock, PhoneCall } from 'lucide-react';
import { useRecentCalls } from '@/hooks/use-recent-calls';

export function RecentCallsList() {
  const { calls, loading, error } = useRecentCalls({ limit: 5 });

  return (
    <div className="space-y-4">
      {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
      {error && <p className="text-sm text-red-600">Error: {error}</p>}
      {calls.map(call => (
        <div key={call.id} className="flex items-start space-x-4">
          <Avatar className="h-9 w-9">
            <AvatarFallback>
              {call.callerName ? call.callerName.charAt(0) : '?'}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium leading-none">
                {call.callerName || 'Unknown'}
              </p>
              <div className="flex items-center text-xs text-muted-foreground">
                <PhoneCall className="mr-1 h-3 w-3" />
                {call.phoneNumber || 'Unknown'}
              </div>
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
            {call.summary && (
              <p className="text-sm text-muted-foreground">{call.summary}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
