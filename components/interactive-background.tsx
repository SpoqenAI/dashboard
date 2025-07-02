'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface InteractiveBackgroundProps {
  children: React.ReactNode;
  variant?: 'hero' | 'features' | 'dashboard' | 'minimal';
  className?: string;
}

export function InteractiveBackground({ 
  children, 
  variant = 'hero', 
  className 
}: InteractiveBackgroundProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [, forceUpdate] = useState({});

  useEffect(() => {
    // Set client flag to true after component mounts
    setIsClient(true);

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    // Animation loop for smooth updates
    let animationId: number;
    const animate = () => {
      forceUpdate({});
      animationId = requestAnimationFrame(animate);
    };

    if (variant === 'hero') {
      animationId = requestAnimationFrame(animate);
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [variant]);

  const renderBackgroundElements = () => {
    // Use static values during SSR, dynamic values on client
    const staticMouseX = 50;
    const staticMouseY = 50;
    const staticTime = 0;
    
    const currentMouseX = isClient ? mousePosition.x : staticMouseX;
    const currentMouseY = isClient ? mousePosition.y : staticMouseY;
    const currentScrollY = isClient ? scrollY : 0;
    const currentTime = isClient ? Date.now() : staticTime;

    switch (variant) {
      case 'hero':
        return (
          <>
            {/* Main interactive orb that follows mouse */}
            <div 
              className="absolute w-96 h-96 bg-primary/30 rounded-full blur-3xl transition-all duration-700 ease-out"
              style={{
                left: `${currentMouseX * 0.3}%`,
                top: `${currentMouseY * 0.3 + currentScrollY * 0.1}%`,
                transform: `translate(-50%, -50%) scale(${1 + Math.sin(currentTime * 0.001) * 0.2})`,
              }}
            />
            
            {/* Secondary orb with inverse movement */}
            <div 
              className="absolute w-80 h-80 bg-secondary/25 rounded-full blur-3xl transition-all duration-1000 ease-out"
              style={{
                right: `${(100 - currentMouseX) * 0.2}%`,
                bottom: `${(100 - currentMouseY) * 0.2 + currentScrollY * 0.05}%`,
                transform: `translate(50%, 50%) scale(${1 + Math.cos(currentTime * 0.0015) * 0.15})`,
              }}
            />
            
            {/* Accent orb with circular motion */}
            <div 
              className="absolute w-72 h-72 bg-accent/20 rounded-full blur-3xl transition-all duration-500"
              style={{
                left: `${50 + Math.sin(currentTime * 0.0008 + currentMouseX * 0.01) * 20}%`,
                top: `${50 + Math.cos(currentTime * 0.0008 + currentMouseY * 0.01) * 20 + currentScrollY * 0.03}%`,
                transform: 'translate(-50%, -50%)',
              }}
            />
            
            {/* Interactive gradient overlay */}
            <div 
              className="absolute inset-0 opacity-40 transition-all duration-1000"
              style={{
                background: `radial-gradient(circle at ${currentMouseX}% ${currentMouseY}%, 
                  hsl(315 100% 50% / 0.1) 0%, 
                  hsl(270 100% 60% / 0.05) 30%, 
                  hsl(180 100% 50% / 0.03) 60%, 
                  transparent 100%)`,
              }}
            />
            
            {/* Floating particles */}
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-primary/40 rounded-full blur-sm animate-float"
                style={{
                  left: `${20 + i * 10 + Math.sin(currentTime * 0.001 + i) * 5}%`,
                  top: `${30 + i * 8 + Math.cos(currentTime * 0.001 + i) * 3 + currentScrollY * 0.02}%`,
                  animationDelay: `${i * 0.3}s`,
                  animationDuration: `${4 + i * 0.5}s`,
                }}
              />
            ))}
          </>
        );

      case 'features':
        return (
          <>
            {/* Subtle background orbs */}
            <div 
              className="absolute w-64 h-64 bg-primary/20 rounded-full blur-3xl transition-all duration-1000"
              style={{
                left: `${currentMouseX * 0.1}%`,
                top: `${currentMouseY * 0.1}%`,
              }}
            />
            <div 
              className="absolute w-48 h-48 bg-accent/15 rounded-full blur-3xl transition-all duration-1500"
              style={{
                right: `${(100 - currentMouseX) * 0.15}%`,
                bottom: `${(100 - currentMouseY) * 0.15}%`,
              }}
            />
          </>
        );

      case 'dashboard':
        return (
          <>
            {/* Minimal dashboard background */}
            <div 
              className="absolute w-32 h-32 bg-primary/10 rounded-full blur-2xl transition-all duration-2000"
              style={{
                left: `${currentMouseX * 0.05}%`,
                top: `${currentMouseY * 0.05}%`,
              }}
            />
          </>
        );

      case 'minimal':
        return (
          <div 
            className="absolute inset-0 opacity-20 transition-all duration-2000"
            style={{
              background: `radial-gradient(circle at ${currentMouseX}% ${currentMouseY}%, 
                hsl(315 100% 50% / 0.05) 0%, 
                transparent 50%)`,
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {renderBackgroundElements()}
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}