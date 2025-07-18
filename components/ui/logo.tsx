import Image from 'next/image';
import React from 'react';
import SpoqenFull from '@/public/Spoqen-full.png';

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Logo – lightweight component for rendering the Spoqen logo.
 * Uses next/image for automatic optimisation. Accepts optional width/height.
 */
export const Logo: React.FC<LogoProps> = ({
  width = 102,
  height = 36,
  className,
}) => (
  <Image
    src={SpoqenFull}
    alt="Spoqen Logo"
    width={width}
    height={height}
    className={className}
    placeholder="blur"
    priority
  />
);

export default Logo;
