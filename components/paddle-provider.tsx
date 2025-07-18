'use client';

import { useEffect } from 'react';
import { getPaddleInstance } from '@/lib/paddle-js';

export default function PaddleProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const env =
      (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT as
        | 'sandbox'
        | 'production') || 'production';
    getPaddleInstance(env).catch(() => {
      // Failed to init Paddle – ignore, checkout will lazy init later
    });
  }, []);

  return <>{children}</>;
}
