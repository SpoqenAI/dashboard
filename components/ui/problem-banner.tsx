import { AlertTriangle, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProblemBannerProps {
  className?: string;
}

export function ProblemBanner({ className }: ProblemBannerProps) {
  return (
    <div
      className={cn(
        'w-full rounded-lg border border-red-500/20 bg-gradient-to-r from-red-500/10 via-orange-500/10 to-red-500/10 py-6 backdrop-blur-glass',
        className
      )}
    >
      <div className="container px-6">
        <div className="flex flex-col items-center space-y-3 text-center">
          <div className="flex items-center space-x-2 text-red-400">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm font-medium uppercase tracking-wider">
              The Hidden Cost
            </span>
          </div>

          <h3 className="text-2xl font-bold text-foreground md:text-3xl">
            Missed calls cost SMEs{' '}
            <span className="text-red-400">$8.5K per year</span> on average
          </h3>

          <p className="max-w-2xl text-lg text-muted-foreground">
            Every missed call is a lost opportunity. While you're busy running
            your business, potential customers are hanging up and calling your
            competitors instead.
          </p>

          <div
            className="flex flex-col items-center space-y-4 pt-2 sm:flex-row sm:space-y-0 sm:space-x-6"
          >
            <div className="flex items-center space-x-2 text-red-400">
              <TrendingDown className="h-4 w-4" />
              <span className="text-sm">73% never call back</span>
            </div>
            <div className="hidden h-4 w-px bg-red-400/30 sm:block"></div>
            <div className="flex items-center space-x-2 text-red-400">
              <TrendingDown className="h-4 w-4" />
              <span className="text-sm">42% go to competitors</span>
            </div>
            <div className="hidden h-4 w-px bg-red-400/30 sm:block"></div>
            <div className="flex items-center space-x-2 text-red-400">
              <TrendingDown className="h-4 w-4" />
              <span className="text-sm">$1.2K avg. lost deal</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
