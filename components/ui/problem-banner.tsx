import { AlertTriangle, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProblemBannerProps {
  className?: string;
}

export function ProblemBanner({ className }: ProblemBannerProps) {
  return (
    <div className={cn(
      "w-full py-6 bg-gradient-to-r from-red-500/10 via-orange-500/10 to-red-500/10 border border-red-500/20 rounded-lg backdrop-blur-glass",
      className
    )}>
      <div className="container px-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex items-center space-x-2 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm font-medium uppercase tracking-wider">The Hidden Cost</span>
          </div>
          
          <h3 className="text-2xl md:text-3xl font-bold text-foreground">
            Missed calls cost SMEs <span className="text-red-400">$8.5K per year</span> on average
          </h3>
          
          <p className="text-muted-foreground max-w-2xl text-lg">
            Every missed call is a lost opportunity. While you're busy running your business, 
            potential customers are hanging up and calling your competitors instead.
          </p>
          
          <div className="flex items-center space-x-6 pt-2">
            <div className="flex items-center space-x-2 text-red-400">
              <TrendingDown className="w-4 h-4" />
              <span className="text-sm">73% never call back</span>
            </div>
            <div className="w-px h-4 bg-red-400/30"></div>
            <div className="flex items-center space-x-2 text-red-400">
              <TrendingDown className="w-4 h-4" />
              <span className="text-sm">42% go to competitors</span>
            </div>
            <div className="w-px h-4 bg-red-400/30"></div>
            <div className="flex items-center space-x-2 text-red-400">
              <TrendingDown className="w-4 h-4" />
              <span className="text-sm">$1.2K avg. lost deal</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 