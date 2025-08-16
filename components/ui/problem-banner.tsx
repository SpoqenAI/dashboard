import {
  AlertTriangle,
  PhoneOff,
  GitBranch,
  CircleDollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProblemBannerProps {
  className?: string;
}

export function ProblemBanner({ className }: ProblemBannerProps) {
  return (
    <div className="relative">
      {/* Solid, edge-to-edge backdrop that matches the orange card footprint */}
      <div
        className="absolute inset-0 rounded-lg bg-white dark:bg-black"
        aria-hidden="true"
      />
      <div
        className={cn(
          'relative w-full rounded-lg border border-orange-500/20 bg-orange-500/10 py-6 dark:bg-orange-500/15',
          className
        )}
      >
        <div className="container px-6">
          <div className="flex flex-col items-center space-y-3 text-center">
            <div className="flex items-center space-x-2 text-orange-400">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm font-medium uppercase tracking-wider">
                The Hidden Cost
              </span>
            </div>

            <h3 className="text-2xl font-bold text-foreground md:text-3xl">
              Missed calls cost SMEs{' '}
              <span className="text-orange-400">$8.5K per year</span> on average
            </h3>

            <p className="max-w-2xl text-lg text-muted-foreground">
              Every missed call is a lost opportunity. While you're busy running
              your business, potential customers are hanging up and calling your
              competitors instead.
            </p>

            <div className="flex flex-col items-center space-y-4 pt-2 sm:flex-row sm:space-x-6 sm:space-y-0">
              <div className="flex items-center space-x-2 text-orange-400">
                <PhoneOff className="h-4 w-4" />
                <span className="text-sm">73% never call back</span>
              </div>
              <div className="hidden h-4 w-px bg-orange-400/30 sm:block"></div>
              <div className="flex items-center space-x-2 text-orange-400">
                <GitBranch className="h-4 w-4" />
                <span className="text-sm">42% go to competitors</span>
              </div>
              <div className="hidden h-4 w-px bg-orange-400/30 sm:block"></div>
              <div className="flex items-center space-x-2 text-orange-400">
                <CircleDollarSign className="h-4 w-4" />
                <span className="text-sm">$1.2K avg. lost deal</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
