'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import for the interactive background
const OptimizedInteractiveBackground = dynamic(
  () =>
    import('@/components/interactive-background').then(mod => ({
      default: mod.InteractiveBackground,
    })),
  {
    loading: () => (
      <div className="min-h-screen bg-[radial-gradient(ellipse_60%_80%_at_20%_40%,rgba(139,92,246,0.1),transparent)] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(29,155,240,0.1),rgba(255,255,255,0))] bg-background" />
    ),
    ssr: false,
  }
);

interface ProgressiveBackgroundLoaderProps {
  variant?: 'hero' | 'features' | 'minimal';
  className?: string;
  children?: React.ReactNode;
  fallbackStyle?: React.CSSProperties;
}

export function ProgressiveBackgroundLoader({
  variant = 'hero',
  className,
  children,
  fallbackStyle,
}: ProgressiveBackgroundLoaderProps) {
  const [shouldLoadBackground, setShouldLoadBackground] = useState(false);

  useEffect(() => {
    const shouldLoad = () => {
      // Check if user prefers reduced motion
      const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      if (prefersReducedMotion) return false;

      // Check viewport size (≥768px)
      const isLargeViewport = window.innerWidth >= 768;
      if (!isLargeViewport) return false;

      return true;
    };

    // Use requestIdleCallback for non-critical loading
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        if (shouldLoad()) {
          setShouldLoadBackground(true);
        }
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        if (shouldLoad()) {
          setShouldLoadBackground(true);
        }
      }, 100);
    }
  }, []);

  const BackgroundComponent = shouldLoadBackground
    ? OptimizedInteractiveBackground
    : 'div';

  return (
    <BackgroundComponent
      variant={variant}
      className={className}
      {...(shouldLoadBackground
        ? {}
        : {
            style: fallbackStyle || {
              background:
                'linear-gradient(to bottom, hsl(var(--background)), hsl(var(--card)))',
            },
          })}
    >
      {children}
    </BackgroundComponent>
  );
}
