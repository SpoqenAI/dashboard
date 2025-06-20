'use client';

import Image from 'next/image';
import { useState } from 'react';

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function Logo({ className = '', width = 200, height = 60 }: LogoProps) {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    console.warn('Logo image failed to load, falling back to text logo');
    setImageError(true);
  };

  // If image failed to load, show text fallback
  if (imageError) {
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
      onError={handleImageError}
    />
  );
}
