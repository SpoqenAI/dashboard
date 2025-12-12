'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'motion/react';

export interface MotionStaggerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  delayChildren?: number;
  staggerChildren?: number;
  inView?: boolean;
  once?: boolean;
  amount?: number;
}

export function MotionStagger({
  children,
  delayChildren = 0.05,
  staggerChildren = 0.08,
  inView = false,
  once = true,
  amount = 0.25,
  className,
  ...props
}: MotionStaggerProps) {
  const reducedMotion = useReducedMotion();

  const viewport = inView && !reducedMotion ? { once, amount } : undefined;

  const initial = reducedMotion ? false : 'hidden';
  const animate = reducedMotion ? undefined : inView ? undefined : 'show';
  const whileInView = reducedMotion ? undefined : inView ? 'show' : undefined;

  return (
    <motion.div
      className={className}
      initial={initial}
      animate={animate}
      whileInView={whileInView}
      viewport={viewport}
      variants={
        reducedMotion
          ? undefined
          : {
              hidden: {},
              show: {
                transition: {
                  staggerChildren,
                  delayChildren,
                },
              },
            }
      }
      {...props}
    >
      {children}
    </motion.div>
  );
}

export interface MotionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
}

export function MotionItem({
  children,
  direction = 'up',
  distance = 14,
  className,
  ...props
}: MotionItemProps) {
  const reducedMotion = useReducedMotion();

  const hidden =
    direction === 'none'
      ? { opacity: 0 }
      : direction === 'up'
        ? { opacity: 0, y: distance }
        : direction === 'down'
          ? { opacity: 0, y: -distance }
          : direction === 'left'
            ? { opacity: 0, x: -distance }
            : { opacity: 0, x: distance };

  return (
    <motion.div
      className={className}
      variants={
        reducedMotion
          ? undefined
          : {
              hidden,
              show: {
                opacity: 1,
                x: 0,
                y: 0,
                transition: {
                  duration: 0.65,
                  ease: [0.22, 1, 0.36, 1],
                },
              },
            }
      }
      {...props}
    >
      {children}
    </motion.div>
  );
}
