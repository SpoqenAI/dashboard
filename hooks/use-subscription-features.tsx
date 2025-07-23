'use client';

import { useMemo } from 'react';
import { useSubscription } from '@/hooks/use-subscription';
import {
  getSubscriptionTier,
  getFeatureLimits,
  hasFeatureAccess,
  canMakeCalls,
  getRemainingCalls,
  shouldShowUpgradePrompt,
  getUpgradeMessage,
  hasDashboardAccess,
  hasAnalyticsAccess,
  type SubscriptionTier,
  type FeatureLimits,
  type PaddleSubscription,
} from '@/lib/paddle';

export interface SubscriptionFeatures {
  tier: SubscriptionTier;
  limits: FeatureLimits;
  canMakeCalls: (currentUsage?: number) => boolean;
  getRemainingCalls: (currentUsage?: number) => number | 'unlimited';
  hasFeature: (feature: string, subFeature?: string) => boolean;
  shouldShowUpgrade: boolean;
  getUpgradeMessage: (feature: string) => string;
  isLoading: boolean;
  subscription: PaddleSubscription | null;
}

export function useSubscriptionFeatures(): SubscriptionFeatures {
  const { subscription, loading } = useSubscription();

  const features = useMemo(() => {
    const tier = getSubscriptionTier(subscription);
    const limits = getFeatureLimits(subscription);

    return {
      tier,
      limits,
      canMakeCalls: (currentUsage = 0) =>
        canMakeCalls(subscription, currentUsage),
      getRemainingCalls: (currentUsage = 0) =>
        getRemainingCalls(subscription, currentUsage),
      hasFeature: (feature: string, subFeature?: string) =>
        hasFeatureAccess(subscription, feature, subFeature),
      shouldShowUpgrade: shouldShowUpgradePrompt(subscription),
      getUpgradeMessage: (feature: string) =>
        getUpgradeMessage(subscription, feature),
      isLoading: loading,
      subscription,
    };
  }, [subscription, loading]);

  return features;
}

// Specific feature hooks for common use cases
export function useAnalyticsFeatures() {
  const { hasFeature, shouldShowUpgrade, getUpgradeMessage } =
    useSubscriptionFeatures();

  return {
    canViewAnalytics: true, // Everyone can view analytics (free and paid)
    shouldShowUpgrade: shouldShowUpgrade,
    getUpgradeMessage: (feature: string) =>
      getUpgradeMessage(`analytics - ${feature}`),
  };
}

export function useIntegrationFeatures() {
  const { hasFeature, shouldShowUpgrade, getUpgradeMessage } =
    useSubscriptionFeatures();

  return {
    canUseWebhook: true, // Everyone can use webhook integrations (free and paid)
    shouldShowUpgrade: shouldShowUpgrade,
    getUpgradeMessage: (integration: string) =>
      getUpgradeMessage(`${integration} integration`),
  };
}

export function useCustomizationFeatures() {
  const { hasFeature, shouldShowUpgrade, getUpgradeMessage } =
    useSubscriptionFeatures();

  return {
    canUseBasicGreeting: true, // Everyone can customize their AI assistant (free and paid)
    shouldShowUpgrade: shouldShowUpgrade,
    getUpgradeMessage: (feature: string) =>
      getUpgradeMessage(`custom ${feature}`),
  };
}

export function useSupportFeatures() {
  const { hasFeature, shouldShowUpgrade, getUpgradeMessage } =
    useSubscriptionFeatures();

  return {
    hasCommunitySupport: hasFeature('support', 'community'),
    hasEmailSupport: hasFeature('support', 'email'),
    hasPrioritySupport: hasFeature('support', 'priority'),
    hasDedicatedSupport: hasFeature('support', 'dedicated'),
    shouldShowUpgrade: shouldShowUpgrade,
    getUpgradeMessage: (level: string) => getUpgradeMessage(`${level} support`),
  };
}

export function useDashboardFeatures() {
  const { subscription, shouldShowUpgrade, getUpgradeMessage } =
    useSubscriptionFeatures();

  return {
    hasAnalyticsAccess: hasAnalyticsAccess(subscription),
    hasDashboardAccess: hasDashboardAccess(subscription),
    shouldShowUpgrade: shouldShowUpgrade,
    getUpgradeMessage: (feature: string) =>
      getUpgradeMessage(`dashboard ${feature}`),
  };
}
