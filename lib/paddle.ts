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
  tier_type: 'free' | 'paid';
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

  // Note: NEXT_PUBLIC_PADDLE_PRICE_ID is legacy - we now use specific price IDs per tier

  // Only check server-only environment variables when running in Node.js environment
  const isServerSide =
    typeof window === 'undefined' &&
    typeof process !== 'undefined' &&
    process.versions?.node;

  if (isServerSide) {
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
  // Check both status and tier - canceled subscriptions are not active
  const activeStatuses = ['active', 'trialing'];
  const hasActiveStatus = activeStatuses.includes(subscription.status);
  const hasValidTier = subscription.tier_type !== 'free';

  return hasActiveStatus && hasValidTier;
};

export const isFreeUser = (
  subscription: PaddleSubscription | null
): boolean => {
  // If no subscription at all, they're definitely free
  if (!subscription) return true;

  // Check tier_type field - if it's 'free', user is on free tier
  if (subscription.tier_type === 'free') return true;

  // For now, treat canceled subscriptions as free to be safe
  // This prevents infinite loops while still providing basic protection
  if (subscription.status === 'canceled') return true;

  // Check other inactive statuses
  const inactiveStatuses = ['past_due', 'paused'];
  if (inactiveStatuses.includes(subscription.status)) {
    return true;
  }

  return false;
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

// Feature gating types
export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'business';

export interface FeatureLimits {
  calls: {
    monthly: number;
    unlimited: boolean;
  };
  minutes: {
    perCall: number;
    unlimited: boolean;
  };
  analytics: {
    basic: boolean;
    advanced: boolean;
    customReports: boolean;
  };
  integrations: {
    webhook: boolean;
    zapier: boolean;
    crm: boolean;
  };
  support: {
    community: boolean;
    email: boolean;
    priority: boolean;
    dedicated: boolean;
  };
  customization: {
    basicGreeting: boolean;
    customScripts: boolean;
    multiLanguage: boolean;
    aiTraining: boolean;
  };
  // New access controls
  dashboard: {
    analytics: boolean;
    fullAccess: boolean;
  };
}

// Define feature limits for each tier
export const TIER_LIMITS: Record<SubscriptionTier, FeatureLimits> = {
  free: {
    calls: { monthly: 0, unlimited: false },
    minutes: { perCall: 0, unlimited: false },
    analytics: { basic: false, advanced: false, customReports: false },
    integrations: { webhook: false, zapier: false, crm: false },
    support: {
      community: true,
      email: false,
      priority: false,
      dedicated: false,
    },
    customization: {
      basicGreeting: true,
      customScripts: false,
      multiLanguage: false,
      aiTraining: false,
    },
    dashboard: { analytics: false, fullAccess: true }, // Can see dashboard but no analytics data
  },
  starter: {
    calls: { monthly: 30, unlimited: false },
    minutes: { perCall: 60, unlimited: false },
    analytics: { basic: true, advanced: false, customReports: false },
    integrations: { webhook: false, zapier: false, crm: false },
    support: {
      community: true,
      email: true,
      priority: false,
      dedicated: false,
    },
    customization: {
      basicGreeting: true,
      customScripts: false,
      multiLanguage: false,
      aiTraining: false,
    },
    dashboard: { analytics: true, fullAccess: true },
  },
  pro: {
    calls: { monthly: 0, unlimited: true },
    minutes: { perCall: 0, unlimited: true },
    analytics: { basic: true, advanced: true, customReports: false },
    integrations: { webhook: true, zapier: false, crm: true },
    support: { community: true, email: true, priority: true, dedicated: false },
    customization: {
      basicGreeting: true,
      customScripts: true,
      multiLanguage: false,
      aiTraining: false,
    },
    dashboard: { analytics: true, fullAccess: true },
  },
  business: {
    calls: { monthly: 0, unlimited: true },
    minutes: { perCall: 0, unlimited: true },
    analytics: { basic: true, advanced: true, customReports: true },
    integrations: { webhook: true, zapier: true, crm: true },
    support: { community: true, email: true, priority: true, dedicated: true },
    customization: {
      basicGreeting: true,
      customScripts: true,
      multiLanguage: true,
      aiTraining: true,
    },
    dashboard: { analytics: true, fullAccess: true },
  },
};

// Enhanced feature gating functions
export const getSubscriptionTier = (
  subscription: PaddleSubscription | null
): SubscriptionTier => {
  // If no subscription, return free
  if (!subscription) {
    return 'free';
  }

  // If subscription is explicitly free tier, return free
  if (subscription.tier_type === 'free') {
    return 'free';
  }

  // Check subscription status - inactive subscriptions should be treated as free
  const inactiveStatuses = ['canceled', 'past_due', 'paused'];
  if (inactiveStatuses.includes(subscription.status)) {
    return 'free';
  }

  // Only allow access for active/trialing subscriptions
  const activeStatuses = ['active', 'trialing'];
  if (!activeStatuses.includes(subscription.status)) {
    return 'free';
  }

  // For paid subscriptions, determine tier based on price_id
  // Configure these with your actual Paddle price IDs via environment variables
  const STARTER_PRICE_IDS =
    process.env.PADDLE_STARTER_PRICE_IDS?.split(',') ||
    [
      process.env.NEXT_PUBLIC_PADDLE_STARTER_MONTHLY_PRICE_ID,
      process.env.NEXT_PUBLIC_PADDLE_STARTER_ANNUAL_PRICE_ID,
      process.env.NEXT_PUBLIC_PADDLE_PRICE_ID, // legacy fallback
    ].filter(Boolean);
  const PRO_PRICE_IDS =
    process.env.PADDLE_PRO_PRICE_IDS?.split(',') ||
    [
      // No fallback values; must be set in env
    ];
  const BUSINESS_PRICE_IDS =
    process.env.PADDLE_BUSINESS_PRICE_IDS?.split(',') || [];

  if (STARTER_PRICE_IDS.includes(subscription.price_id)) {
    return 'starter';
  }

  if (PRO_PRICE_IDS.includes(subscription.price_id)) {
    return 'pro';
  }

  if (BUSINESS_PRICE_IDS.includes(subscription.price_id)) {
    return 'business';
  }

  // Default fallback for paid subscriptions
  console.warn(
    `Unrecognized price_id: ${subscription.price_id}, defaulting to starter tier`
  );
  return 'starter';
};

export const getFeatureLimits = (
  subscription: PaddleSubscription | null
): FeatureLimits => {
  const tier = getSubscriptionTier(subscription);
  return TIER_LIMITS[tier];
};

export const hasFeatureAccess = <T extends keyof FeatureLimits>(
  subscription: PaddleSubscription | null,
  feature: T,
  subFeature?: keyof FeatureLimits[T]
): boolean => {
  const limits = getFeatureLimits(subscription);
  const featureLimits = limits[feature];

  if (
    subFeature &&
    typeof featureLimits === 'object' &&
    featureLimits !== null
  ) {
    return (
      (featureLimits as Record<string, boolean>)[subFeature as string] === true
    );
  }

  return false;
};

export const canMakeCalls = (
  subscription: PaddleSubscription | null,
  currentMonthlyUsage: number = 0
): boolean => {
  const limits = getFeatureLimits(subscription);

  if (limits.calls.unlimited) {
    return true;
  }

  return currentMonthlyUsage < limits.calls.monthly;
};

export const getRemainingCalls = (
  subscription: PaddleSubscription | null,
  currentMonthlyUsage: number = 0
): number | 'unlimited' => {
  const limits = getFeatureLimits(subscription);

  if (limits.calls.unlimited) {
    return 'unlimited';
  }

  return Math.max(0, limits.calls.monthly - currentMonthlyUsage);
};

export const shouldShowUpgradePrompt = (
  subscription: PaddleSubscription | null
): boolean => {
  return (
    isFreeUser(subscription) ||
    (subscription ? !isActiveSubscription(subscription) : true)
  );
};

export const getUpgradeMessage = (
  subscription: PaddleSubscription | null,
  feature: string
): string => {
  const tier = getSubscriptionTier(subscription);

  if (tier === 'free') {
    return `Upgrade to Starter ($10/month) to unlock ${feature}`;
  }

  if (tier === 'starter') {
    return `Upgrade to Pro ($30/month) to unlock ${feature}`;
  }

  return `This feature requires a higher subscription tier`;
};

// Dashboard access helpers
export const hasDashboardAccess = (
  subscription: PaddleSubscription | null
): boolean => {
  const limits = getFeatureLimits(subscription);
  return limits.dashboard.fullAccess;
};

export const hasAnalyticsAccess = (
  subscription: PaddleSubscription | null
): boolean => {
  const limits = getFeatureLimits(subscription);
  return limits.dashboard.analytics;
};
