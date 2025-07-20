'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { getPaddleInstance } from '@/lib/paddle-js';
import { logger } from '@/lib/logger';

// Paddle initialization context
interface PaddleContextType {
  isInitialized: boolean;
  isInitializing: boolean;
  error: Error | null;
}

const PaddleContext = createContext<PaddleContextType>({
  isInitialized: false,
  isInitializing: false,
  error: null,
});

// Hook to access Paddle initialization status
export const usePaddleStatus = () => useContext(PaddleContext);

export default function PaddleProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initializePaddle = async () => {
      try {
        setIsInitializing(true);
        setError(null);

        await getPaddleInstance();

        setIsInitialized(true);
        logger.info('PADDLE_PROVIDER', 'Paddle v2 initialized successfully');
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        logger.warn(
          'PADDLE_PROVIDER',
          'Failed to initialize Paddle v2 during provider setup',
          error
        );

        setError(error);
        // Failed to init Paddle – ignore, checkout will lazy init later
      } finally {
        setIsInitializing(false);
      }
    };

    initializePaddle();
  }, []);

  const contextValue: PaddleContextType = {
    isInitialized,
    isInitializing,
    error,
  };

  return (
    <PaddleContext.Provider value={contextValue}>
      {children}
    </PaddleContext.Provider>
  );
}
