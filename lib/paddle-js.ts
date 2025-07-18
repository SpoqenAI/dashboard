// Paddle JS helper for client-side overlay checkout initialization
// This runs only in the browser and lazily loads the @paddle/paddle-js package.

import { getPaddleConfig } from './config';
import { logger } from '@/lib/logger';

// TypeScript interfaces for Paddle SDK v2.x
export interface PaddleCheckoutItem {
  priceId: string;
  quantity: number;
}

export interface PaddleCheckoutCustomer {
  email: string;
  name?: string;
}

export interface PaddleCheckoutSettings {
  displayMode: 'inline';
  frameTarget: string;
  successUrl: string;
}

export interface PaddleCheckoutEvents {
  complete: () => void;
  close: () => void;
}

export interface PaddleInlineCheckoutOptions {
  items: PaddleCheckoutItem[];
  customer: PaddleCheckoutCustomer;
  customData: Record<string, string>;
  settings: PaddleCheckoutSettings;
  events: PaddleCheckoutEvents;
}

export interface PaddleOverlayCheckoutOptions {
  checkoutId: string;
  events?: {
    complete?: () => void;
    close?: () => void;
  };
}

interface PaddleCheckout {
  open: (
    options: PaddleInlineCheckoutOptions | PaddleOverlayCheckoutOptions
  ) => void;
}

interface PaddleSDK {
  Checkout: PaddleCheckout;
}

let isInitialized = false;

export async function getPaddleInstance(): Promise<PaddleSDK> {
  if (typeof window === 'undefined') {
    throw new Error('Paddle JS can only be initialized in the browser');
  }

  // Get validated configuration
  const config = getPaddleConfig();

  try {
    // Import and use the modern SDK v2.x initialization
    const { initializePaddle } = await import('@paddle/paddle-js');

    // Only initialize once
    if (!isInitialized) {
      // Initialize Paddle with the client token
      await initializePaddle({
        token: config.clientToken,
        environment: config.environment as 'sandbox' | 'production',
      });

      isInitialized = true;

      logger.info('PADDLE_JS', 'Paddle SDK initialized successfully', {
        environment: config.environment,
      });
    }

    // Return the global Paddle object (available on window after initialization)
    if (typeof window !== 'undefined' && (window as any).Paddle) {
      return (window as any).Paddle as PaddleSDK;
    } else {
      throw new Error(
        'Paddle SDK not available on window object after initialization'
      );
    }
  } catch (error) {
    logger.error(
      'PADDLE_JS',
      'Failed to initialize Paddle SDK',
      error instanceof Error ? error : new Error(String(error)),
      { environment: config.environment }
    );
    throw new Error(
      `Failed to initialize Paddle SDK: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function openPaddleCheckout(
  checkoutId: string,
  onComplete?: () => void,
  onClose?: () => void
): Promise<void> {
  const Paddle = await getPaddleInstance();
  return new Promise<void>((resolve, reject) => {
    try {
      // Always attach event handlers to ensure proper Promise resolution
      const options: PaddleOverlayCheckoutOptions = {
        checkoutId,
        events: {
          complete: () => {
            onComplete?.();
            resolve();
          },
          close: () => {
            onClose?.();
            // still resolve; overlay closed by user
            resolve();
          },
        },
      };

      Paddle.Checkout.open(options);
    } catch (err) {
      reject(err);
    }
  });
}
