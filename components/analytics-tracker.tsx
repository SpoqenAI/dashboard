'use client';

import { useEffect } from 'react';
import {
  initializeAnalytics,
  trackConversion,
} from '@/lib/analytics-tracking';

interface AnalyticsTrackerProps {
  page: string;
  source?: string;
}

export function AnalyticsTracker({ page, source }: AnalyticsTrackerProps) {
  useEffect(() => {
    const analytics = initializeAnalytics();
    
    trackConversion('landing_page_view', {
      source: typeof window !== 'undefined' ? window.location.search : source,
      referrer: typeof window !== 'undefined' ? document.referrer : '',
      page,
    });

    return () => {
      analytics?.cleanup();
    };
  }, [page, source]);

  return null; // This component only handles side effects
} 