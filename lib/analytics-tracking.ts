// PERFORMANCE OPTIMIZED: Analytics tracking with proper throttling and cleanup

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp?: number;
  userId?: string;
  sessionId?: string;
}

interface UserEngagement {
  scrollDepth: number;
  timeOnPage: number;
  interactionEvents: string[];
  conversionFunnel: string[];
}

class AnalyticsTracker {
  private sessionId: string;
  private startTime: number;
  private maxScrollDepth: number = 0;
  private engagementEvents: string[] = [];
  private conversionFunnel: string[] = [];
  
  // PERFORMANCE: Add cleanup tracking
  private scrollListener: (() => void) | null = null;
  private visibilityListener: (() => void) | null = null;
  private timeoutIds: NodeJS.Timeout[] = [];

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.initializeTracking();
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private initializeTracking() {
    // PERFORMANCE: Only initialize if in browser environment
    if (typeof window === 'undefined') return;
    
    this.initializeScrollTracking();
    this.initializeTimeTracking();
    this.initializeVisibilityTracking();
  }

  private initializeScrollTracking() {
    // PERFORMANCE: Improved throttling with RAF for smoother performance
    let ticking = false;
    let lastScrollTime = 0;
    const SCROLL_THROTTLE_DELAY = 100; // 100ms throttle

    const updateScrollDepth = () => {
      const now = Date.now();
      
      // Skip if called too frequently
      if (now - lastScrollTime < SCROLL_THROTTLE_DELAY) {
        ticking = false;
        return;
      }
      
      lastScrollTime = now;
      
      const scrollTop = window.pageYOffset;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      
      // Prevent division by zero
      if (docHeight <= 0) {
        ticking = false;
        return;
      }
      
      const scrollPercent = Math.min((scrollTop / docHeight) * 100, 100);

      if (scrollPercent > this.maxScrollDepth) {
        this.maxScrollDepth = scrollPercent;

        // Track scroll milestones with debouncing
        this.trackScrollMilestone(scrollPercent);
      }

      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollDepth);
        ticking = true;
      }
    };

    // PERFORMANCE: Store listener reference for cleanup
    this.scrollListener = onScroll;
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // PERFORMANCE: Debounced scroll milestone tracking
  private trackScrollMilestone(scrollPercent: number) {
    const milestones = [
      { threshold: 25, event: 'scroll_25' },
      { threshold: 50, event: 'scroll_50' },
      { threshold: 75, event: 'scroll_75' },
      { threshold: 90, event: 'scroll_90' }
    ];

    milestones.forEach(({ threshold, event }) => {
      if (scrollPercent >= threshold && !this.engagementEvents.includes(event)) {
        this.trackEvent(event, { scrollDepth: threshold });
        this.engagementEvents.push(event);
      }
    });
  }

  private initializeTimeTracking() {
    // PERFORMANCE: Store timeout IDs for cleanup
    const timeouts = [
      { delay: 30000, event: 'time_on_page_30s', time: 30 },
      { delay: 60000, event: 'time_on_page_60s', time: 60 },
      { delay: 120000, event: 'time_on_page_120s', time: 120 }
    ];

    timeouts.forEach(({ delay, event, time }) => {
      const timeoutId = setTimeout(() => {
        this.trackEvent(event, { timeSpent: time });
      }, delay);
      
      this.timeoutIds.push(timeoutId);
    });
  }

  private initializeVisibilityTracking() {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        this.trackEvent('page_hidden', {
          timeSpent: (Date.now() - this.startTime) / 1000,
          scrollDepth: this.maxScrollDepth
        });
      } else {
        this.trackEvent('page_visible', {
          timestamp: Date.now()
        });
      }
    };

    // PERFORMANCE: Store listener reference for cleanup
    this.visibilityListener = handleVisibilityChange;
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  // PERFORMANCE: Add cleanup method
  public cleanup() {
    // Clean up scroll listener
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
      this.scrollListener = null;
    }

    // Clean up visibility listener
    if (this.visibilityListener) {
      document.removeEventListener('visibilitychange', this.visibilityListener);
      this.visibilityListener = null;
    }

    // Clean up timeouts
    this.timeoutIds.forEach(id => clearTimeout(id));
    this.timeoutIds = [];
  }

  // Public methods for tracking specific events

  public trackEvent(event: string, properties: Record<string, any> = {}) {
    const analyticsEvent: AnalyticsEvent = {
      event,
      properties: {
        ...properties,
        sessionId: this.sessionId,
        timeOnPage: (Date.now() - this.startTime) / 1000,
        scrollDepth: this.maxScrollDepth,
        url: window.location.href
      },
      timestamp: Date.now()
    };

    // PERFORMANCE: Queue events for batch processing
    this.queueEvent(analyticsEvent);
  }

  // PERFORMANCE: Batch event processing
  private eventQueue: AnalyticsEvent[] = [];
  private batchTimeoutId: NodeJS.Timeout | null = null;

  private queueEvent(event: AnalyticsEvent) {
    this.eventQueue.push(event);

    // Process queue after short delay for batching
    if (this.batchTimeoutId) {
      clearTimeout(this.batchTimeoutId);
    }

    this.batchTimeoutId = setTimeout(() => {
      this.processBatchedEvents();
    }, 500); // 500ms batch delay
  }

  private processBatchedEvents() {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    events.forEach(event => {
      this.sendToAnalytics(event);
      this.storeEventLocally(event);
    });
  }

  // Conversion funnel tracking
  public trackConversionStep(step: string, properties: Record<string, any> = {}) {
    this.conversionFunnel.push(step);
    this.trackEvent(`conversion_${step}`, {
      ...properties,
      funnelStep: this.conversionFunnel.length,
      funnelPath: this.conversionFunnel.join(' → ')
    });
  }

  // Demo interaction tracking
  public trackDemoInteraction(action: string, data: Record<string, any> = {}) {
    this.trackEvent(`demo_${action}`, {
      ...data,
      demoTimestamp: Date.now()
    });
  }

  // ROI calculator tracking
  public trackROICalculatorUsage(data: Record<string, any>) {
    this.trackEvent('roi_calculator_used', {
      ...data,
      engagementType: 'interactive_tool'
    });
  }

  // CTA button tracking
  public trackCTAClick(ctaType: string, location: string, properties: Record<string, any> = {}) {
    this.trackConversionStep('cta_clicked');
    this.trackEvent('cta_clicked', {
      ctaType,
      location,
      ...properties
    });
  }

  // Video engagement tracking
  public trackVideoEngagement(action: string, data: Record<string, any> = {}) {
    this.trackEvent(`video_${action}`, {
      ...data,
      mediaType: 'video'
    });
  }

  // Form interaction tracking
  public trackFormInteraction(formType: string, action: string, data: Record<string, any> = {}) {
    this.trackEvent(`form_${action}`, {
      formType,
      ...data
    });
  }

  // Pricing interaction tracking
  public trackPricingInteraction(action: string, data: Record<string, any> = {}) {
    this.trackEvent(`pricing_${action}`, {
      ...data,
      section: 'pricing'
    });
  }

  // PERFORMANCE: Optimized analytics service integration
  private sendToAnalytics(event: AnalyticsEvent) {
    // Google Analytics 4 with error handling
    if (typeof window !== 'undefined' && typeof (window as any).gtag !== 'undefined') {
      try {
        (window as any).gtag('event', event.event, event.properties);
      } catch (error) {
        console.warn('GA4 tracking error:', error);
      }
    }

    // Facebook Pixel with error handling
    if (typeof window !== 'undefined' && typeof (window as any).fbq !== 'undefined') {
      try {
        (window as any).fbq('track', event.event, event.properties);
      } catch (error) {
        console.warn('Facebook Pixel tracking error:', error);
      }
    }

    // Custom analytics endpoint with retry logic
    if (process.env.NODE_ENV === 'production') {
      this.sendWithRetry('/api/analytics', event);
    }
  }

  // PERFORMANCE: Add retry logic for analytics endpoints
  private async sendWithRetry(endpoint: string, event: AnalyticsEvent, retries = 2) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (!response.ok && retries > 0) {
        // Retry with exponential backoff
        setTimeout(() => {
          this.sendWithRetry(endpoint, event, retries - 1);
        }, Math.pow(2, 3 - retries) * 1000);
      }
    } catch (error) {
      if (retries > 0) {
        setTimeout(() => {
          this.sendWithRetry(endpoint, event, retries - 1);
        }, Math.pow(2, 3 - retries) * 1000);
      } else {
        console.error('Analytics tracking failed after retries:', error);
      }
    }
  }

  private storeEventLocally(event: AnalyticsEvent) {
    try {
      const events = JSON.parse(localStorage.getItem('analytics_events') || '[]');
      events.push(event);
      
      // Keep only last 50 events to prevent storage bloat
      if (events.length > 50) {
        events.splice(0, events.length - 50);
      }
      
      localStorage.setItem('analytics_events', JSON.stringify(events));
    } catch (error) {
      console.error('Local storage error:', error);
    }
  }

  // Page exit tracking with cleanup
  public trackPageExit() {
    this.trackEvent('page_exit', {
      timeSpent: (Date.now() - this.startTime) / 1000,
      scrollDepth: this.maxScrollDepth,
      funnelProgress: this.conversionFunnel.length
    });

    // Process any remaining events immediately
    if (this.eventQueue.length > 0) {
      this.processBatchedEvents();
    }

    // Cleanup resources
    this.cleanup();
  }

  // Get session summary
  public getSessionSummary(): UserEngagement {
    return {
      scrollDepth: this.maxScrollDepth,
      timeOnPage: (Date.now() - this.startTime) / 1000,
      interactionEvents: this.engagementEvents,
      conversionFunnel: this.conversionFunnel
    };
  }
}

// PERFORMANCE: Singleton instance with cleanup
let globalAnalyticsTracker: AnalyticsTracker | null = null;

export function initializeAnalytics(): AnalyticsTracker {
  // Clean up existing tracker if any
  if (globalAnalyticsTracker) {
    globalAnalyticsTracker.cleanup();
  }
  
  globalAnalyticsTracker = new AnalyticsTracker();
  return globalAnalyticsTracker;
}

// PERFORMANCE: Add cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (globalAnalyticsTracker) {
      globalAnalyticsTracker.trackPageExit();
    }
  });
}

// Convenience methods for external use
export function trackEvent(event: string, properties?: Record<string, any>) {
  if (!globalAnalyticsTracker) {
    globalAnalyticsTracker = initializeAnalytics();
  }
  globalAnalyticsTracker.trackEvent(event, properties);
}

export function trackConversion(step: string, properties?: Record<string, any>) {
  if (!globalAnalyticsTracker) {
    globalAnalyticsTracker = initializeAnalytics();
  }
  globalAnalyticsTracker.trackConversionStep(step, properties);
}

export function trackCTA(ctaType: string, location: string, properties?: Record<string, any>) {
  if (!globalAnalyticsTracker) {
    globalAnalyticsTracker = initializeAnalytics();
  }
  globalAnalyticsTracker.trackCTAClick(ctaType, location, properties);
}

export function trackDemo(action: string, data?: Record<string, any>) {
  if (!globalAnalyticsTracker) {
    globalAnalyticsTracker = initializeAnalytics();
  }
  globalAnalyticsTracker.trackDemoInteraction(action, data);
}

export function trackROICalculator(data: Record<string, any>) {
  if (!globalAnalyticsTracker) {
    globalAnalyticsTracker = initializeAnalytics();
  }
  globalAnalyticsTracker.trackROICalculatorUsage(data);
}

export function getAnalyticsTracker(): AnalyticsTracker | null {
  return globalAnalyticsTracker;
}

export function cleanupAnalytics() {
  if (globalAnalyticsTracker) {
    globalAnalyticsTracker.cleanup();
    globalAnalyticsTracker = null;
  }
}

// Export types
export type { AnalyticsEvent, UserEngagement }; 