'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

/**
 * Lazy-loads the heavy Recharts-powered chart primitives only when actually rendered.
 *
 * Example usage:
 *   import {
 *     ChartContainer,
 *     ChartTooltip,
 *     ChartLegend,
 *   } from '@/components/ui/chart-loader';
 */

export const ChartContainer = dynamic(
  () =>
    import('./chart').then(
      m => m.ChartContainer as unknown as ComponentType<any>
    ),
  { ssr: false }
);

export const ChartTooltip = dynamic(
  () =>
    import('./chart').then(
      m => m.ChartTooltip as unknown as ComponentType<any>
    ),
  { ssr: false }
);

export const ChartTooltipContent = dynamic(
  () =>
    import('./chart').then(
      m => m.ChartTooltipContent as unknown as ComponentType<any>
    ),
  { ssr: false }
);

export const ChartLegend = dynamic(
  () =>
    import('./chart').then(m => m.ChartLegend as unknown as ComponentType<any>),
  { ssr: false }
);

export const ChartLegendContent = dynamic(
  () =>
    import('./chart').then(
      m => m.ChartLegendContent as unknown as ComponentType<any>
    ),
  { ssr: false }
);

// Default export: container (most common case).
export default ChartContainer;
