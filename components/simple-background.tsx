import { cn } from '@/lib/utils';

interface SimpleBackgroundProps {
  children: React.ReactNode;
  variant?: 'hero' | 'heroV2' | 'features' | 'minimal';
  className?: string;
}

export function SimpleBackground({
  children,
  variant = 'hero',
  className,
}: SimpleBackgroundProps) {
  const variantClasses: Record<typeof variant, string> = {
    hero: 'bg-gradient-to-b from-background via-card/20 to-card/40',
    heroV2: 'bg-white dark:bg-background',
    features: 'bg-gradient-to-b from-card/30 to-background',
    minimal: 'bg-background',
  } as const;

  return (
    <div className={cn('relative', variantClasses[variant], className)}>
      {children}
    </div>
  );
}
