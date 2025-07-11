import React, { useRef, useEffect, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

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
export const LockedOverlay: React.FC<LockedOverlayProps> = ({
  upgradeHref = '/billing',
  className = '',
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLAnchorElement>(null);

  // Focus management: focus the upgrade button when overlay appears
  useEffect(() => {
    if (buttonRef.current) {
      buttonRef.current.focus();
    }
  }, []);

  // Keyboard accessibility: dismiss on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent | KeyboardEventInit) => {
      if (e.key === 'Escape') {
        // Optionally, you could call a dismiss/close prop here
        // For now, just blur the overlay
        if (overlayRef.current) {
          overlayRef.current.blur();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown as any);
    return () => {
      window.removeEventListener('keydown', handleKeyDown as any);
    };
  }, []);

  return (
    <div
      ref={overlayRef}
      className={`absolute inset-0 z-40 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md ${className}`}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-6 text-center shadow-lg">
        <h3 className="text-2xl font-bold">Unlock Advanced Analytics</h3>
        <p className="text-muted-foreground">
          Upgrade to access detailed analytics, unlimited call history, and
          premium AI insights.
        </p>
        <Button size="lg" className="w-full" asChild>
          <Link href={upgradeHref} passHref legacyBehavior>
            <a ref={buttonRef}>Upgrade&nbsp;Now</a>
          </Link>
        </Button>
      </div>
    </div>
  );
};
