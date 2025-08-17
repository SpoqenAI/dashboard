'use client';

import React from 'react';

interface FeatureGuideLineProps {
  side: 'left' | 'right';
  branchY?: number; // 0..100 in viewBox units
  className?: string;
  strokeWidth?: number;
}

/**
 * Decorative guide line: draws a vertical center line with a subtle branch
 * to either the left or right to visually guide the eye between columns.
 *
 * Render inside a relatively positioned parent. This component is aria-hidden
 * and pointer-events-none by default (via consumer className).
 */
export function FeatureGuideLine({
  side,
  branchY = 58,
  className,
  strokeWidth = 2,
}: FeatureGuideLineProps) {
  const y = Math.max(0, Math.min(100, branchY));
  const cx = 50;
  const path =
    side === 'left'
      ? // Vertical line + branch to the left (slight curve)
        `M ${cx},0 L ${cx},100 M ${cx},${y} C ${cx - 6},${y} ${cx - 18},${y} 0,${y}`
      : // Vertical line + branch to the right (slight curve)
        `M ${cx},0 L ${cx},100 M ${cx},${y} C ${cx + 6},${y} ${cx + 18},${y} 100,${y}`;

  return (
    <svg
      className={className}
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.18}
      />
    </svg>
  );
}

export default FeatureGuideLine;
