// Analytics and Performance Tracking System
// Comprehensive tracking for onboarding funnel optimization

import { logger } from '@/lib/logger';

// Event types for conversion funnel tracking
export type AnalyticsEvent =
  | 'onboarding_started'
  | 'profile_completed'
  | 'assistant_setup_completed'
  | 'payment_initiated'
  | 'payment_completed'
  | 'payment_failed'
  | 'subscription_created'
  | 'onboarding_completed'
  | 'dashboard_accessed'
  | 'assistant_provisioned'
  | 'error_encountered'
  | 'page_viewed'
  | 'performance_metric';

// Properties for analytics events
export interface AnalyticsProperties {
  userId?: string;
  sessionId?: string;
  timestamp?: number;
  page?: string;
  userAgent?: string;
  referrer?: string;
  duration?: number;
  error?: string;
  errorCode?: string;
  subscriptionId?: string;
  assistantName?: string;
  paymentMethod?: string;
  amount?: number;
  currency?: string;
  device?: 'mobile' | 'tablet' | 'desktop';
  isRetry?: boolean;
  retryCount?: number;
  cacheHit?: boolean;
  [key: string]: any;
}

// Performance metrics
export interface PerformanceMetrics {
  eventType: 'performance_metric';
  metricName: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  userId?: string;
  page?: string;
  additionalData?: Record<string, any>;
}

// Conversion funnel stages
export const FUNNEL_STAGES = {
  PROFILE_SETUP: 'profile_setup',
  ASSISTANT_SETUP: 'assistant_setup',
  PAYMENT: 'payment',
  PROCESSING: 'processing',
  COMPLETION: 'completion',
  DASHBOARD: 'dashboard',
} as const;

// Analytics client interface
interface AnalyticsClient {
  track(event: AnalyticsEvent, properties?: AnalyticsProperties): Promise<void>;
  identify(userId: string, traits?: Record<string, any>): Promise<void>;
  page(name: string, properties?: AnalyticsProperties): Promise<void>;
  trackPerformance(metrics: PerformanceMetrics): Promise<void>;
}

// In-memory analytics for development and fallback
class InMemoryAnalytics implements AnalyticsClient {
  private events: Array<{
    event: AnalyticsEvent;
    properties?: AnalyticsProperties;
    timestamp: number;
  }> = [];

  async track(
    event: AnalyticsEvent,
    properties?: AnalyticsProperties
  ): Promise<void> {
    const eventData = {
      event,
      properties: {
        ...properties,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    };

    this.events.push(eventData);

    // Log for development debugging
    logger.info('ANALYTICS', `Event: ${event}`, {
      event,
      properties: this.sanitizeProperties(properties),
    });

    // Keep only last 1000 events in memory
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }

  async identify(userId: string, traits?: Record<string, any>): Promise<void> {
    logger.info('ANALYTICS', 'User identified', {
      userId: logger.maskUserId(userId),
      traits,
    });
  }

  async page(name: string, properties?: AnalyticsProperties): Promise<void> {
    await this.track('page_viewed', { ...properties, page: name });
  }

  async trackPerformance(metrics: PerformanceMetrics): Promise<void> {
    logger.info('ANALYTICS_PERF', `Performance: ${metrics.metricName}`, {
      metricName: metrics.metricName,
      value: metrics.value,
      unit: metrics.unit,
      userId: metrics.userId ? logger.maskUserId(metrics.userId) : undefined,
      page: metrics.page,
      additionalData: metrics.additionalData,
    });
  }

  private sanitizeProperties(
    properties?: AnalyticsProperties
  ): AnalyticsProperties | undefined {
    if (!properties) return undefined;

    const sanitized = { ...properties };
    if (sanitized.userId) {
      sanitized.userId = logger.maskUserId(sanitized.userId);
    }
    return sanitized;
  }

  // Development utility to get recent events
  getRecentEvents(count = 10): Array<{
    event: AnalyticsEvent;
    properties?: AnalyticsProperties;
    timestamp: number;
  }> {
    return this.events.slice(-count);
  }
}

// Analytics client singleton
let analyticsClient: AnalyticsClient;

// Initialize analytics client
function getAnalyticsClient(): AnalyticsClient {
  if (!analyticsClient) {
    // For now, use in-memory analytics
    // In production, this could be replaced with Segment, Mixpanel, etc.
    analyticsClient = new InMemoryAnalytics();
  }
  return analyticsClient;
}

// Convenience functions for common tracking patterns
export const analytics = {
  // Track conversion funnel events
  async trackFunnelStage(
    stage: string,
    properties?: AnalyticsProperties
  ): Promise<void> {
    await getAnalyticsClient().track('onboarding_started', {
      ...properties,
      funnelStage: stage,
    });
  },

  // Track onboarding completion
  async trackOnboardingComplete(
    userId: string,
    duration: number,
    properties?: AnalyticsProperties
  ): Promise<void> {
    await getAnalyticsClient().track('onboarding_completed', {
      ...properties,
      userId,
      duration,
      success: true,
    });
  },

  // Track payment events
  async trackPaymentEvent(
    event: 'payment_initiated' | 'payment_completed' | 'payment_failed',
    properties?: AnalyticsProperties
  ): Promise<void> {
    await getAnalyticsClient().track(event, properties);
  },

  // Track errors with context
  async trackError(
    error: Error | string,
    context?: AnalyticsProperties
  ): Promise<void> {
    await getAnalyticsClient().track('error_encountered', {
      ...context,
      error: error instanceof Error ? error.message : error,
      errorStack: error instanceof Error ? error.stack : undefined,
    });
  },

  // Track page views
  async trackPageView(
    page: string,
    properties?: AnalyticsProperties
  ): Promise<void> {
    await getAnalyticsClient().page(page, properties);
  },

  // Track performance metrics
  async trackPerformance(
    metricName: string,
    value: number,
    unit: PerformanceMetrics['unit'],
    additionalData?: Record<string, any>
  ): Promise<void> {
    await getAnalyticsClient().trackPerformance({
      eventType: 'performance_metric',
      metricName,
      value,
      unit,
      additionalData,
    });
  },

  // Track user identification
  async identify(userId: string, traits?: Record<string, any>): Promise<void> {
    await getAnalyticsClient().identify(userId, traits);
  },

  // Batch track multiple events (useful for performance)
  async trackBatch(
    events: Array<{ event: AnalyticsEvent; properties?: AnalyticsProperties }>
  ): Promise<void> {
    for (const { event, properties } of events) {
      await getAnalyticsClient().track(event, properties);
    }
  },
};

// Performance monitoring helpers
export const performance = {
  // Track time to interactive
  async trackTimeToInteractive(
    startTime: number,
    userId?: string,
    page?: string
  ): Promise<void> {
    const tti = Date.now() - startTime;
    await analytics.trackPerformance('time_to_interactive', tti, 'ms', {
      userId,
      page,
    });
  },

  // Track API response times
  async trackApiResponse(
    endpoint: string,
    duration: number,
    success: boolean,
    statusCode?: number
  ): Promise<void> {
    await analytics.trackPerformance('api_response_time', duration, 'ms', {
      endpoint,
      success,
      statusCode,
    });
  },

  // Track subscription creation time
  async trackSubscriptionCreationTime(
    duration: number,
    userId?: string
  ): Promise<void> {
    await analytics.trackPerformance(
      'subscription_creation_time',
      duration,
      'ms',
      {
        userId,
        critical: true,
      }
    );
  },

  // Track middleware performance
  async trackMiddlewarePerformance(
    duration: number,
    cacheHit: boolean,
    requestPath: string
  ): Promise<void> {
    await analytics.trackPerformance(
      'middleware_response_time',
      duration,
      'ms',
      {
        cacheHit,
        requestPath,
        optimal: duration < 50, // Flag if response time is optimal
      }
    );
  },
};

// Conversion funnel tracking
export const funnel = {
  // Track funnel drop-off
  async trackDropOff(
    fromStage: string,
    userId?: string,
    reason?: string
  ): Promise<void> {
    await analytics.trackError(`Funnel drop-off: ${fromStage}`, {
      userId,
      funnelStage: fromStage,
      dropOffReason: reason,
    });
  },

  // Track funnel progression
  async trackProgression(
    fromStage: string,
    toStage: string,
    userId?: string,
    duration?: number
  ): Promise<void> {
    await getAnalyticsClient().track('onboarding_started', {
      userId,
      funnelProgression: `${fromStage}_to_${toStage}`,
      duration,
      success: true,
    });
  },

  // Calculate conversion rates (for analytics dashboard)
  async getConversionRate(fromStage: string, toStage: string): Promise<number> {
    // This would query analytics data in a real implementation
    // For now, return a placeholder
    return 0.85; // 85% conversion rate placeholder
  },
};

// A/B testing helpers (for future optimization)
export const experiments = {
  // Track experiment participation
  async trackExperiment(
    experimentName: string,
    variant: string,
    userId?: string
  ): Promise<void> {
    await getAnalyticsClient().track('onboarding_started', {
      userId,
      experimentName,
      experimentVariant: variant,
      isExperiment: true,
    });
  },

  // Track experiment conversion
  async trackExperimentConversion(
    experimentName: string,
    variant: string,
    userId?: string
  ): Promise<void> {
    await getAnalyticsClient().track('onboarding_completed', {
      userId,
      experimentName,
      experimentVariant: variant,
      isExperimentConversion: true,
    });
  },
};

// Export the main analytics instance
export default analytics;
