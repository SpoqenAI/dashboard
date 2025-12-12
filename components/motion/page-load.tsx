'use client';

import * as React from 'react';
import { MotionStagger } from '@/components/motion/stagger';

export interface MotionPageLoadProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function MotionPageLoad({ children, ...props }: MotionPageLoadProps) {
  return <MotionStagger {...props}>{children}</MotionStagger>;
}
