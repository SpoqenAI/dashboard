import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModernStatsCardProps {
  title: string;
  value: string;
  change?: string;
  icon: LucideIcon;
  color?: 'primary' | 'secondary' | 'accent';
  className?: string;
}

export function ModernStatsCard({
  title,
  value,
  change,
  icon: Icon,
  color = 'primary',
  className,
}: ModernStatsCardProps) {
  const colorClasses = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    accent: 'text-accent',
  };

  const glowClasses = {
    primary: 'hover:shadow-glow-primary/20',
    secondary: 'hover:shadow-glow-secondary/20',
    accent: 'hover:shadow-glow-accent/20',
  };

  return (
    <Card className={cn(
      'group hover:scale-105 transition-all duration-300',
      glowClasses[color],
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn(
          'p-2 rounded-lg bg-gradient-to-r from-card/50 to-card/80 group-hover:scale-110 transition-transform duration-300',
          colorClasses[color]
        )}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p className="text-xs text-muted-foreground">
            <span className={cn(
              'font-medium',
              change.startsWith('+') ? 'text-green-400' : 'text-red-400'
            )}>
              {change}
            </span>
            {' '}from last month
          </p>
        )}
      </CardContent>
    </Card>
  );
}