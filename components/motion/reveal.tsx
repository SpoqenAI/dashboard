'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'motion/react';

type RevealDirection = 'up' | 'down' | 'left' | 'right' | 'none';

export interface MotionRevealProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  direction?: RevealDirection;
  delay?: number;
  duration?: number;
  once?: boolean;
  amount?: number;
}

export function MotionReveal({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.6,
  once = true,
  amount = 0.25,
  className,
  ...props
}: MotionRevealProps) {
  const reducedMotion = useReducedMotion();

  const offset = 16;
  const hidden =
    direction === 'none'
      ? { opacity: 0 }
      : direction === 'up'
        ? { opacity: 0, y: offset }
        : direction === 'down'
          ? { opacity: 0, y: -offset }
          : direction === 'left'
            ? { opacity: 0, x: -offset }
            : { opacity: 0, x: offset };

  const show = reducedMotion ? { opacity: 1 } : { opacity: 1, x: 0, y: 0 };

  return (
    <motion.div
      className={className}
      initial={reducedMotion ? false : hidden}
      whileInView={reducedMotion ? undefined : show}
      animate={reducedMotion ? show : undefined}
      viewport={reducedMotion ? undefined : { once, amount }}
      transition={
        reducedMotion
          ? undefined
          : {
              duration,
              delay,
              ease: [0.22, 1, 0.36, 1],
            }
      }
      {...props}
    >
      {children}
    </motion.div>
  );
}
