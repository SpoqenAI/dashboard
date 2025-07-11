"use client";

import { useEffect, useRef, useState } from 'react';

interface LazyMountProps {
  children: React.ReactNode;
  /**
   * Root margin passed to the IntersectionObserver.
   * Set to preload slightly before element enters the viewport.
   * Default: "200px" (above/below)
   */
  rootMargin?: string;
}

/**
 * LazyMount delays rendering of heavyweight children until they are near the viewport.
 * This avoids running React effects & loading bundles for content far below the fold.
 */
export function LazyMount({ children, rootMargin = '200px' }: LazyMountProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    // If IntersectionObserver is not available (very old browsers / bots), render immediately.
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [rootMargin]);

  return <div ref={ref}>{isVisible ? children : null}</div>;
} 