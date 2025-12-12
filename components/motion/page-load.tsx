'use client';

import * as React from 'react';
import { MotionStagger } from '@/components/motion/stagger';

export type MotionPageLoadProps = React.ComponentProps<typeof MotionStagger>;

export function MotionPageLoad({ children, ...props }: MotionPageLoadProps) {
  return <MotionStagger {...props}>{children}</MotionStagger>;
}
