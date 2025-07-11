import React from 'react';
import { Button } from '@/components/ui/button';

interface LockedOverlayProps {
  /**
   * Destination for the CTA button. Defaults to `/billing`.
   */
  upgradeHref?: string;
  /**
   * Additional Tailwind classes if the caller needs custom positioning.
   */
  className?: string;
}

/**
 * LockedOverlay
 * -----------------------------------------------------------------------------
 * Displays a semi-transparent layer with a teaser message and an "Upgrade now"
 * button. Used to prevent interaction with premium-only dashboard areas while
 * still allowing overall site navigation (e.g., switching tabs).
 */
export function LockedOverlay({
  upgradeHref = '/billing',
  className = '',
}: LockedOverlayProps) {
  return (
    <div
      className={`absolute inset-0 z-40 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md ${className}`}
    >
      <div className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-6 text-center shadow-lg">
        <h3 className="text-2xl font-bold">Unlock Advanced Analytics</h3>
        <p className="text-muted-foreground">
          Upgrade to access detailed analytics, unlimited call history, and
          premium AI insights.
        </p>
        <Button size="lg" className="w-full" asChild>
          <a href={upgradeHref}>Upgrade&nbsp;Now</a>
        </Button>
      </div>
    </div>
  );
}
