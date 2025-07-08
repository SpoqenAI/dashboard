'use client';

import { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface InteractiveBackgroundProps {
  children: React.ReactNode;
  variant?: 'hero' | 'features' | 'dashboard' | 'minimal';
  className?: string;
}

// Performance-optimized constants
const PERFORMANCE_CONFIG = {
  MOUSE_THROTTLE_MS: 32, // 30fps for mouse tracking
  SCROLL_THROTTLE_MS: 16, // 60fps for scroll
  ANIMATION_THROTTLE_MS: 16, // 60fps for animations
  INTERSECTION_THRESHOLD: 0.1, // 10% visibility required
  REDUCE_MOTION_QUERY: '(prefers-reduced-motion: reduce)',
} as const;

interface OrbConfig {
  size: number;
  opacity: number;
  blur: string;
  color: string;
}

interface VariantConfig {
  orbs: OrbConfig[];
  particleCount: number;
  animationIntensity: number;
  gpuAcceleration: boolean;
}

// Theme-aware variant configs - we'll generate these dynamically
const getVariantConfigs = (isDark: boolean): Record<string, VariantConfig> => {
  const primaryOpacity = isDark ? 0.25 : 0.15;
  const secondaryOpacity = isDark ? 0.2 : 0.12;
  const accentOpacity = isDark ? 0.15 : 0.08;
  
  return {
    hero: {
      orbs: [
        { size: 384, opacity: primaryOpacity, blur: 'blur-3xl', color: '' }, // We'll use inline styles
        { size: 320, opacity: secondaryOpacity, blur: 'blur-3xl', color: '' },
        { size: 288, opacity: accentOpacity, blur: 'blur-2xl', color: '' },
      ],
      particleCount: 6,
      animationIntensity: 1,
      gpuAcceleration: true,
    },
    features: {
      orbs: [
        { size: 256, opacity: isDark ? 0.15 : 0.08, blur: 'blur-2xl', color: '' },
        { size: 192, opacity: isDark ? 0.12 : 0.06, blur: 'blur-xl', color: '' },
      ],
      particleCount: 0,
      animationIntensity: 0.5,
      gpuAcceleration: true,
    },
    dashboard: {
      orbs: [
        { size: 128, opacity: isDark ? 0.08 : 0.04, blur: 'blur-xl', color: '' },
      ],
      particleCount: 0,
      animationIntensity: 0.2,
      gpuAcceleration: false,
    },
    minimal: {
      orbs: [],
      particleCount: 0,
      animationIntensity: 0.1,
      gpuAcceleration: false,
    },
  };
};

// Custom hook for RAF-based throttling
function useRAFThrottle<T extends (...args: any[]) => void>(
  callback: T,
  deps: React.DependencyList
): T {
  const frameRef = useRef<number | null>(null);
  const argsRef = useRef<Parameters<T> | null>(null);

  const throttledCallback = useCallback((...args: Parameters<T>) => {
    argsRef.current = args;

    if (frameRef.current === null) {
      frameRef.current = requestAnimationFrame(() => {
        if (argsRef.current) {
          callback(...argsRef.current);
        }
        frameRef.current = null;
        argsRef.current = null;
      });
    }
  }, deps) as T;

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, []);

  return throttledCallback;
}

// Custom hook for intersection observer
function useIntersectionObserver(
  elementRef: React.RefObject<Element | null>,
  threshold = PERFORMANCE_CONFIG.INTERSECTION_THRESHOLD
) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold]);

  return isVisible;
}

// Custom hook for mouse and scroll tracking
function useMouseAndScroll() {
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
  const [scrollY, setScrollY] = useState(0);

  const updateMousePosition = useCallback((x: number, y: number) => {
    setMousePosition({
      x: (x / window.innerWidth) * 100,
      y: (y / window.innerHeight) * 100,
    });
  }, []);

  const updateScrollY = useCallback((y: number) => {
    setScrollY(y);
  }, []);

  const throttledMouseMove = useRAFThrottle(
    (e: MouseEvent) => {
      updateMousePosition(e.clientX, e.clientY);
    },
    [updateMousePosition]
  );

  const throttledScroll = useRAFThrottle(() => {
    updateScrollY(window.scrollY);
  }, [updateScrollY]);

  useEffect(() => {
    // Passive listeners for better performance
    window.addEventListener('mousemove', throttledMouseMove, { passive: true });
    window.addEventListener('scroll', throttledScroll, { passive: true });

    return () => {
      window.removeEventListener('mousemove', throttledMouseMove);
      window.removeEventListener('scroll', throttledScroll);
    };
  }, [throttledMouseMove, throttledScroll]);

  return { mousePosition, scrollY };
}

// Individual orb component for better performance isolation
const BackgroundOrb = memo<{
  config: OrbConfig;
  index: number;
  mousePosition: { x: number; y: number };
  scrollY: number;
  animationIntensity: number;
  isVisible: boolean;
  isDark: boolean;
}>(props => {
  const {
    config,
    index,
    mousePosition,
    scrollY,
    animationIntensity,
    isVisible,
    isDark,
  } = props;

  // Get the appropriate color based on orb index and theme
  const getOrbColor = (orbIndex: number) => {
    const colors = [
      'hsl(315 100% 50%)', // primary - magenta
      'hsl(180 100% 50%)', // secondary - cyan  
      'hsl(270 100% 60%)', // accent - purple
    ];
    return colors[orbIndex % colors.length];
  };

  const style = useMemo(() => {
    if (!isVisible) return { display: 'none' };

    const mouseSensitivity = 0.3 * animationIntensity;
    const scrollSensitivity = 0.1 * animationIntensity;
    const offsetX =
      index % 2 === 0
        ? mousePosition.x * mouseSensitivity
        : (100 - mousePosition.x) * mouseSensitivity * 0.5;
    const offsetY =
      index % 2 === 0
        ? mousePosition.y * mouseSensitivity
        : (100 - mousePosition.y) * mouseSensitivity * 0.5;

    const orbColor = getOrbColor(index);
    
    return {
      width: config.size,
      height: config.size,
      left: `calc(${offsetX}% - ${config.size / 2}px)`,
      top: `calc(${offsetY + scrollY * scrollSensitivity}% - ${config.size / 2}px)`,
      opacity: config.opacity,
      backgroundColor: orbColor,
      transform: 'translate3d(0, 0, 0)', // GPU acceleration
      willChange: 'transform, opacity',
      contain: 'layout style paint',
    } as React.CSSProperties;
  }, [config, index, mousePosition, scrollY, animationIntensity, isVisible, isDark]);

  return (
    <div
      className={cn(
        'pointer-events-none absolute rounded-full transition-all duration-1000 ease-out',
        config.blur
      )}
      style={style}
    />
  );
});

BackgroundOrb.displayName = 'BackgroundOrb';

// Particle component
const Particle = memo<{
  index: number;
  mousePosition: { x: number; y: number };
  scrollY: number;
  isVisible: boolean;
}>(props => {
  const { index, mousePosition, scrollY, isVisible } = props;

  const style = useMemo(() => {
    if (!isVisible) return { display: 'none' };

    const baseX = 20 + index * 12;
    const baseY = 30 + index * 8;
    const offsetX = Math.sin(Date.now() * 0.001 + index) * 3;
    const offsetY = Math.cos(Date.now() * 0.001 + index) * 2 + scrollY * 0.02;

    return {
      left: `calc(${baseX + offsetX}% - 4px)`,
      top: `calc(${baseY + offsetY}% - 4px)`,
      transform: 'translate3d(0, 0, 0)',
      willChange: 'transform',
      animationDelay: `${index * 0.2}s`,
    } as React.CSSProperties;
  }, [index, mousePosition, scrollY, isVisible]);

  return (
    <div
      className="pointer-events-none absolute h-2 w-2 rounded-full blur-sm"
      style={{
        ...style,
        backgroundColor: 'hsl(315 100% 50% / 0.3)', // primary color with opacity
      }}
    />
  );
});

Particle.displayName = 'Particle';

// Main component
export const InteractiveBackground = memo<InteractiveBackgroundProps>(props => {
  const { children, variant = 'hero', className } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(containerRef);
  const { mousePosition, scrollY } = useMouseAndScroll();

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia(
      PERFORMANCE_CONFIG.REDUCE_MOTION_QUERY
    );
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Handle mounting to prevent hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  const { theme, resolvedTheme } = useTheme();
  // Improve theme detection with better fallbacks
  const isDark = mounted ? (resolvedTheme === 'dark' || (!resolvedTheme && theme === 'dark')) : false;
  
  const shouldAnimate = isVisible && !prefersReducedMotion;
  const config = getVariantConfigs(isDark)[variant];

  // Memoized gradient for minimal variant - theme aware
  const gradientStyle = useMemo(() => {
    if (variant !== 'minimal' || !shouldAnimate) return {};

    const opacity = isDark ? 0.05 : 0.03;
    return {
      background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, 
        hsl(315 100% 50% / ${opacity}) 0%, 
        transparent 50%)`,
    };
  }, [variant, mousePosition.x, mousePosition.y, shouldAnimate, isDark]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden transition-colors duration-300',
        // Use CSS variables that properly respond to theme changes
        'bg-background',
        className
      )}
      style={{
        transform: 'translate3d(0, 0, 0)', // GPU acceleration
        contain: 'layout style paint',
      }}
    >
      {/* Background Elements */}
      <div className="pointer-events-none absolute inset-0">
        {/* Only render background effects after mounting to prevent hydration issues */}
        {!mounted && <div className="absolute inset-0" />}
        {mounted && (
          variant === 'minimal' ? (
            <div
              className="duration-2000 pointer-events-none absolute inset-0 transition-all"
              style={gradientStyle}
            />
          ) : (
            <>
              {/* Render orbs */}
              {config.orbs.map((orbConfig, index) => (
                <BackgroundOrb
                  key={index}
                  config={orbConfig}
                  index={index}
                  mousePosition={mousePosition}
                  scrollY={scrollY}
                  animationIntensity={config.animationIntensity}
                  isVisible={shouldAnimate}
                  isDark={isDark}
                />
              ))}

              {/* Render particles for hero variant */}
              {variant === 'hero' &&
                config.particleCount > 0 &&
                shouldAnimate &&
                Array.from({ length: config.particleCount }, (_, index) => (
                  <Particle
                    key={index}
                    index={index}
                    mousePosition={mousePosition}
                    scrollY={scrollY}
                    isVisible={shouldAnimate}
                  />
                ))}

              {/* Interactive gradient overlay for hero - theme aware */}
              {variant === 'hero' && shouldAnimate && (
                <div
                  className="pointer-events-none absolute inset-0 opacity-30 transition-all duration-1000"
                  style={{
                    background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, 
                      hsl(315 100% 50% / ${isDark ? 0.08 : 0.04}) 0%, 
                      hsl(270 100% 60% / ${isDark ? 0.04 : 0.02}) 30%, 
                      hsl(180 100% 50% / ${isDark ? 0.02 : 0.01}) 60%, 
                      transparent 100%)`,
                  }}
                />
              )}
            </>
          )
        )}
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
});

InteractiveBackground.displayName = 'InteractiveBackground';
