import { cn } from '@/lib/utils';
import { Phone } from 'lucide-react';

interface CallCardProps {
  className?: string;
}

export function CallCard({ className }: CallCardProps) {
  return (
    <div
      className={cn(
        'relative w-full max-w-sm rounded-2xl border border-white/10 bg-card/60 p-4 shadow-xl backdrop-blur-glass sm:max-w-md sm:p-5',
        'ring-1 ring-inset ring-white/5',
        className
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Phone className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">
            Incoming call
          </div>
          <div className="text-xs text-muted-foreground">
            From (415) 555-4823
          </div>
        </div>
      </div>
      <div className="space-y-1.5 sm:space-y-2">
        <p className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground sm:text-sm">
          "Hi, I need to reschedule my service appointment."
        </p>
        <p className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground sm:text-sm">
          "No problem. What day works for you?"
        </p>
        <p className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground sm:text-sm">
          "Next Tuesday morning."
        </p>
      </div>
      <div className="mt-3 flex items-center justify-between sm:mt-4">
        <div className="text-xs text-muted-foreground">Live transcription</div>
        <div className="h-4 w-20 animate-pulse rounded-full bg-primary/20 sm:h-5 sm:w-24" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 sm:mt-4">
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary sm:text-xs">
          Reschedule intent
        </span>
        <span className="rounded-full bg-emerald-600/15 px-2 py-0.5 text-[10px] text-emerald-400 sm:text-xs">
          Booked
        </span>
      </div>
    </div>
  );
}

export default CallCard;
