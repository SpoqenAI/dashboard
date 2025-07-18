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
  hasFeature: <T extends keyof FeatureLimits>(
    feature: T,
    subFeature?: keyof FeatureLimits[T]
  ) => boolean;
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
      hasFeature: <T extends keyof FeatureLimits>(
        feature: T,
        subFeature?: keyof FeatureLimits[T]
      ) => hasFeatureAccess(subscription, feature, subFeature),
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
    canViewBasic: hasFeature('analytics', 'basic'),
    canViewAdvanced: hasFeature('analytics', 'advanced'),
    canViewCustomReports: hasFeature('analytics', 'customReports'),
    shouldShowUpgrade: shouldShowUpgrade,
    getUpgradeMessage: (feature: string) =>
      getUpgradeMessage(`advanced analytics - ${feature}`),
  };
}

export function useIntegrationFeatures() {
  const { hasFeature, shouldShowUpgrade, getUpgradeMessage } =
    useSubscriptionFeatures();

  return {
    canUseWebhook: hasFeature('integrations', 'webhook'),
    canUseZapier: hasFeature('integrations', 'zapier'),
    canUseCRM: hasFeature('integrations', 'crm'),
    shouldShowUpgrade: shouldShowUpgrade,
    getUpgradeMessage: (integration: string) =>
      getUpgradeMessage(`${integration} integration`),
  };
}

export function useCustomizationFeatures() {
  const { hasFeature, shouldShowUpgrade, getUpgradeMessage } =
    useSubscriptionFeatures();

  return {
    canUseBasicGreeting: hasFeature('customization', 'basicGreeting'),
    canUseCustomScripts: hasFeature('customization', 'customScripts'),
    canUseMultiLanguage: hasFeature('customization', 'multiLanguage'),
    canUseAITraining: hasFeature('customization', 'aiTraining'),
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
