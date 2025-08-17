import Image from 'next/image';
import React from 'react';

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Logo – lightweight component for rendering the Spoqen logo.
 * Uses next/image for automatic optimisation. Accepts optional width/height.
 */
// Default header logo size tuned to the cropped viewBox aspect ratio (~3.57:1)
export const Logo: React.FC<LogoProps> = ({
  width = 178,
  height = 50,
  className,
}) => (
  <Image
    src="/Spoqen(2).svg"
    alt="Spoqen Logo"
    width={width}
    height={height}
    className={className}
    priority
  />
);

export default Logo;
