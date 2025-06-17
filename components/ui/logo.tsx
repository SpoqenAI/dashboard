'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function Logo({ className = '', width = 200, height = 60 }: LogoProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder during hydration to avoid mismatch
    return (
      <div
        className={`bg-spoqen-gradient bg-clip-text text-2xl font-bold text-transparent ${className}`}
        style={{ width, height: height * 0.6 }}
      >
        Spoqen
      </div>
    );
  }

  return (
    <Image
      src="/spoqen-transparent-logo.png"
      alt="Spoqen"
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}
