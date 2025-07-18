// Paddle JS helper for client-side checkout initialization
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

// Enhanced settings interface to support both inline and overlay modes
export interface PaddleCheckoutSettings {
  displayMode?: 'overlay' | 'inline';
  frameTarget?: string; // Required when displayMode is 'inline'
  successUrl?: string;
  theme?: 'light' | 'dark';
  locale?: string;
  allowLogout?: boolean;
  variant?: 'one-page' | 'multi-page';
}

export interface PaddleCheckoutEvents {
  complete?: () => void;
  close?: () => void;
  error?: (error: any) => void;
  loaded?: () => void;
  // Additional events for inline checkout
  ready?: () => void;
  success?: (data: any) => void;
  payment?: {
    completed?: (data: any) => void;
    failed?: (error: any) => void;
  };
}

// Comprehensive checkout options interface for both modes
export interface PaddleCheckoutOptions {
  items: PaddleCheckoutItem[];
  customer?: PaddleCheckoutCustomer;
  customData?: Record<string, string>;
  settings?: PaddleCheckoutSettings;
  successUrl?: string; // Can also be set at top level
  events?: PaddleCheckoutEvents;
}

// Legacy overlay-specific interface for backwards compatibility
export interface PaddleOverlayCheckoutOptions {
  checkoutId: string;
  events?: {
    complete?: () => void;
    close?: () => void;
  };
}

interface PaddleCheckout {
  open: (options: PaddleCheckoutOptions | PaddleOverlayCheckoutOptions) => void;
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

// Enhanced function for opening inline checkout
export async function openInlineCheckout(
  containerClass: string,
  priceId: string,
  customerEmail: string,
  customData?: Record<string, string>,
  events?: PaddleCheckoutEvents
): Promise<void> {
  const Paddle = await getPaddleInstance();

  // Clean container class (remove '.' prefix if present)
  const cleanContainerClass = containerClass.startsWith('.') 
    ? containerClass.substring(1) 
    : containerClass;

  // Verify the container element exists using class selector
  const containerElement = document.querySelector(`.${cleanContainerClass}`);
  if (!containerElement) {
    throw new Error(`Container element with class '${cleanContainerClass}' not found`);
  }

  const checkoutOptions: PaddleCheckoutOptions = {
    items: [
      {
        priceId: priceId,
        quantity: 1,
      },
    ],
    customer: {
      email: customerEmail,
    },
    customData: customData || {},
    settings: {
      displayMode: 'inline',
      frameTarget: cleanContainerClass, // Just the class name, no prefix
      theme: 'dark',
      variant: 'one-page',
      allowLogout: false,
    },
    successUrl: `${window.location.origin}/api/paddle/success${customData?.user_id ? `?user_id=${customData.user_id}` : ''}`,
    events: events || {},
  };

  logger.info('PADDLE_JS', 'Opening inline checkout', {
    priceId,
    containerClass: cleanContainerClass,
    frameTarget: cleanContainerClass,
    theme: 'dark',
  });

  try {
    Paddle.Checkout.open(checkoutOptions);
  } catch (error) {
    logger.error(
      'PADDLE_JS',
      'Failed to open inline checkout',
      error instanceof Error ? error : new Error(String(error)),
      { priceId, containerClass: cleanContainerClass }
    );
    throw error;
  }
}

// Legacy function for overlay checkout (backwards compatibility)
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
