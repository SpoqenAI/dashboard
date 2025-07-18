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

let paddleInstance: PaddleSDK | null = null;

export async function getPaddleInstance(): Promise<PaddleSDK> {
  if (paddleInstance) return paddleInstance;

  if (typeof window === 'undefined') {
    throw new Error('Paddle JS can only be initialized in the browser');
  }

  const PaddleMod = await import('@paddle/paddle-js');

  // Type guard to check if the module has a default export
  const hasDefaultExport = (mod: unknown): mod is { default: PaddleSDK } => {
    return typeof mod === 'object' && mod !== null && 'default' in mod;
  };

  // Type guard to check if the module is a PaddleSDK
  const isPaddleSDK = (mod: unknown): mod is PaddleSDK => {
    return (
      typeof mod === 'object' &&
      mod !== null &&
      typeof (mod as PaddleSDK).Checkout === 'object'
    );
  };

  // Safely extract the Paddle SDK from the module
  let Paddle: PaddleSDK;

  if (hasDefaultExport(PaddleMod)) {
    Paddle = PaddleMod.default;
  } else if (isPaddleSDK(PaddleMod)) {
    Paddle = PaddleMod;
  } else {
    throw new Error('Invalid Paddle SDK module structure');
  }

  // Get validated configuration
  const config = getPaddleConfig();

  try {
    // Import and use the modern SDK v2.x initialization
    const { initializePaddle } = await import('@paddle/paddle-js');

    // Initialize Paddle with the client token
    await initializePaddle({ token: config.clientToken });

    // Set environment if needed (this might be handled differently in v2.x)
    if (config.environment === 'sandbox') {
      // Note: Environment setting might be handled differently in SDK v2.x
      // Check Paddle documentation for the correct approach
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

  paddleInstance = Paddle;
  return Paddle;
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
