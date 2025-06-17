import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, Clock, PhoneCall } from 'lucide-react';
import { useRecentCalls } from '@/hooks/use-recent-calls';

export function RecentCallsList({ limit = 5 }: { limit?: number } = {}) {
  const { calls: recentCalls, loading, error } = useRecentCalls(limit);

  if (loading) {
    return <p>Loading recent calls...</p>;
  }

  if (error) {
    return <p className="text-destructive">{error}</p>;
  }

  return (
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
            </div>
            <p className="text-sm text-muted-foreground">{call.summary}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
