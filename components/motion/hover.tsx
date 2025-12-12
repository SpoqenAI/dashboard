'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { HTMLMotionProps } from 'motion/react';

export interface MotionHoverProps extends HTMLMotionProps<'div'> {
  lift?: number;
  scale?: number;
}

export function MotionHover({
  children,
  lift = 4,
  scale = 1.02,
  className,
  ...props
}: MotionHoverProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      whileHover={reducedMotion ? undefined : { y: -lift, scale }}
      whileTap={reducedMotion ? undefined : { scale: 0.985, y: 0 }}
      transition={
        reducedMotion
          ? undefined
          : {
              type: 'spring',
              stiffness: 420,
              damping: 28,
            }
      }
      {...props}
    >
      {children}
    </motion.div>
  );
}
