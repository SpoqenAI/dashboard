// Utility functions and types for Paddle integration

export type PaddleSubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'canceled'
  | 'past_due'
  | 'paused'
  | 'deleted';

export interface PaddleSubscription {
  id: string;
  user_id: string;
  status: PaddleSubscriptionStatus;
  price_id: string;
  quantity: number;
  cancel_at_period_end: boolean;
  current_period_start_at: string | null;
  current_period_end_at: string | null;
  ended_at: string | null;
  cancel_at: string | null;
  canceled_at: string | null;
  trial_start_at: string | null;
  trial_end_at: string | null;
}

export interface PaddleCheckoutConfig {
  priceId: string;
  userId: string;
  email: string;
  quantity?: number;
}

// Environment variable helper
export const getPaddlePriceId = (): string => {
  const priceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID;
  if (!priceId || priceId.trim() === '') {
    throw new Error(
      'NEXT_PUBLIC_PADDLE_PRICE_ID environment variable is required but not set. ' +
        'Please configure this environment variable with your Paddle price ID.'
    );
  }
  return priceId;
};

// Validation helper
export const validatePaddleConfig = (): {
  isValid: boolean;
  missingVars: string[];
} => {
  const missingVars: string[] = [];

  // Always check public environment variables (safe for client-side)
  if (!process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN) {
    missingVars.push('NEXT_PUBLIC_PADDLE_CLIENT_TOKEN');
  }

  if (!process.env.NEXT_PUBLIC_PADDLE_PRICE_ID) {
    missingVars.push('NEXT_PUBLIC_PADDLE_PRICE_ID');
  }

  // Only check server-only environment variables when running in Node.js environment
  const isServerSide =
    typeof window === 'undefined' &&
    typeof process !== 'undefined' &&
    process.versions?.node;

  if (isServerSide) {
    if (!process.env.PADDLE_VENDOR_ID) {
      missingVars.push('PADDLE_VENDOR_ID');
    }

    if (!process.env.PADDLE_API_KEY) {
      missingVars.push('PADDLE_API_KEY');
    }

    if (!process.env.PADDLE_WEBHOOK_SECRET) {
      missingVars.push('PADDLE_WEBHOOK_SECRET');
    }
  }

  return {
    isValid: missingVars.length === 0,
    missingVars,
  };
};

// Subscription status helpers
export const isActiveSubscription = (
  subscription: PaddleSubscription
): boolean => {
  return subscription.status === 'active' || subscription.status === 'trialing';
};

export const isTrialSubscription = (
  subscription: PaddleSubscription
): boolean => {
  return subscription.status === 'trialing';
};

export const isCanceledSubscription = (
  subscription: PaddleSubscription
): boolean => {
  return (
    subscription.status === 'canceled' || subscription.status === 'past_due'
  );
};

// Date helpers
export const formatSubscriptionDate = (dateString: string | null): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const getDaysUntilBilling = (
  currentPeriodEnd: string | null
): number => {
  if (!currentPeriodEnd) return 0;
  const endDate = new Date(currentPeriodEnd);
  const today = new Date();
  const diffTime = endDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};
