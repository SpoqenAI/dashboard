'use client';

import { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
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

const VARIANT_CONFIGS: Record<string, VariantConfig> = {
  hero: {
    orbs: [
      { size: 384, opacity: 0.25, blur: 'blur-3xl', color: 'bg-primary/25' },
      { size: 320, opacity: 0.2, blur: 'blur-3xl', color: 'bg-secondary/20' },
      { size: 288, opacity: 0.15, blur: 'blur-2xl', color: 'bg-accent/15' },
    ],
    particleCount: 6,
    animationIntensity: 1,
    gpuAcceleration: true,
  },
  features: {
    orbs: [
      { size: 256, opacity: 0.15, blur: 'blur-2xl', color: 'bg-primary/15' },
      { size: 192, opacity: 0.12, blur: 'blur-xl', color: 'bg-accent/12' },
    ],
    particleCount: 0,
    animationIntensity: 0.5,
    gpuAcceleration: true,
  },
  dashboard: {
    orbs: [
      { size: 128, opacity: 0.08, blur: 'blur-xl', color: 'bg-primary/8' },
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
} as const;

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

  const throttledMouseMove = useRAFThrottle((e: MouseEvent) => {
    updateMousePosition(e.clientX, e.clientY);
  }, [updateMousePosition]);

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
}>((props) => {
  const { config, index, mousePosition, scrollY, animationIntensity, isVisible } = props;
  
  const style = useMemo(() => {
    if (!isVisible) return { display: 'none' };

    const mouseSensitivity = 0.3 * animationIntensity;
    const scrollSensitivity = 0.1 * animationIntensity;
    const offsetX = index % 2 === 0 ? mousePosition.x * mouseSensitivity : (100 - mousePosition.x) * mouseSensitivity * 0.5;
    const offsetY = index % 2 === 0 ? mousePosition.y * mouseSensitivity : (100 - mousePosition.y) * mouseSensitivity * 0.5;
    
    return {
      width: config.size,
      height: config.size,
      left: `calc(${offsetX}% - ${config.size / 2}px)`,
      top: `calc(${offsetY + scrollY * scrollSensitivity}% - ${config.size / 2}px)`,
      opacity: config.opacity,
      transform: 'translate3d(0, 0, 0)', // GPU acceleration
      willChange: 'transform, opacity',
      contain: 'layout style paint',
    } as React.CSSProperties;
  }, [config, index, mousePosition, scrollY, animationIntensity, isVisible]);

  return (
    <div
      className={cn(
        'absolute rounded-full transition-all duration-1000 ease-out pointer-events-none',
        config.blur,
        config.color
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
}>((props) => {
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
      className="absolute w-2 h-2 bg-primary/30 rounded-full blur-sm pointer-events-none"
      style={style}
    />
  );
});

Particle.displayName = 'Particle';

// Main component
export const InteractiveBackground = memo<InteractiveBackgroundProps>((props) => {
  const { children, variant = 'hero', className } = props;
  
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(containerRef);
  const { mousePosition, scrollY } = useMouseAndScroll();
  
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia(PERFORMANCE_CONFIG.REDUCE_MOTION_QUERY);
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const config = VARIANT_CONFIGS[variant];
  const shouldAnimate = isVisible && !prefersReducedMotion;

  // Memoized gradient for minimal variant
  const gradientStyle = useMemo(() => {
    if (variant !== 'minimal' || !shouldAnimate) return {};
    
    return {
      background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, 
        hsl(315 100% 50% / 0.05) 0%, 
        transparent 50%)`,
    };
  }, [variant, mousePosition.x, mousePosition.y, shouldAnimate]);

  return (
    <div 
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
      style={{
        transform: 'translate3d(0, 0, 0)', // GPU acceleration
        contain: 'layout style paint',
      }}
    >
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {variant === 'minimal' ? (
          <div 
            className="absolute inset-0 transition-all duration-2000 pointer-events-none"
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
              />
            ))}
            
            {/* Render particles for hero variant */}
            {variant === 'hero' && config.particleCount > 0 && shouldAnimate && (
              <>
                {Array.from({ length: config.particleCount }, (_, index) => (
                  <Particle
                    key={index}
                    index={index}
                    mousePosition={mousePosition}
                    scrollY={scrollY}
                    isVisible={shouldAnimate}
                  />
                ))}
              </>
            )}
            
            {/* Interactive gradient overlay for hero */}
            {variant === 'hero' && shouldAnimate && (
              <div 
                className="absolute inset-0 opacity-30 transition-all duration-1000 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, 
                    hsl(315 100% 50% / 0.08) 0%, 
                    hsl(270 100% 60% / 0.04) 30%, 
                    hsl(180 100% 50% / 0.02) 60%, 
                    transparent 100%)`,
                }}
              />
            )}
          </>
        )}
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
});

InteractiveBackground.displayName = 'InteractiveBackground';