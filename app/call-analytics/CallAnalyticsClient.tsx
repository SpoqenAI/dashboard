'use client';

import { useState, useMemo } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardShell } from '@/components/dashboard-shell';
import { useAuth } from '@/hooks/use-auth';
import { useSubscription } from '@/hooks/use-subscription';
import { isFreeUser } from '@/lib/paddle';
// Removed LockedOverlay - free users now have full access
import { useDashboardAnalytics } from '@/hooks/use-dashboard-analytics';
import { useCallUpdates } from '@/hooks/use-call-updates';
import { AlertCircle, ArrowUp } from 'lucide-react';
import { AnalyticsTab } from '@/components/dashboard/analytics-tab';

interface AnalyticsData {
  metrics: {
    totalCalls: number;
    answeredCalls: number;
    missedCalls: number;
    avgDuration: number;
    totalCost: number;
    avgCost: number;
    sentimentDistribution: {
      positive: number;
      neutral: number;
      negative: number;
    };
    leadQualityDistribution: {
      hot: number;
      warm: number;
      cold: number;
    };
  };
  recentCalls?: any[];
  trends?: any;
}

export default function CallAnalyticsClient() {
  const { user } = useAuth();
  const { subscription, loading: subscriptionLoading } = useSubscription();

  // Analytics time range
  const [timeRange, setTimeRange] = useState('30');

  // Determine if user is free tier
  const isUserFree = useMemo(() => {
    if (subscriptionLoading) return false;
    return isFreeUser(subscription);
  }, [subscriptionLoading, subscription]);

  // Analytics hook
  const { analytics, isLoading, error, refetch } = useDashboardAnalytics({
    days: Number(timeRange),
    enabled: !!user, // Free users now have access to analytics
  });

  // Real-time updates hook - trigger refetch when new calls come in
  useCallUpdates({
    enabled: !!user,
    userId: user?.id,
    onNewCall: () => {
      refetch(); // Trigger analytics refetch on new call
    },
    onCallUpdated: () => {
      refetch(); // Trigger analytics refetch on call update
    },
  });

  if (!user) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <DashboardShell>
          <div className="mx-auto max-w-7xl space-y-6 py-6">
            {/* Page title removed to avoid duplication with AnalyticsTab header */}

            <div className="relative space-y-6">
              <AnalyticsTab
                analytics={analytics as AnalyticsData | null}
                isLoading={isLoading}
                error={error ? (error as Error).message : null}
                timeRange={timeRange}
                onTimeRangeChange={setTimeRange}
                isUserFree={isUserFree}
              />
            </div>
          </div>
        </DashboardShell>
      </div>
    </ProtectedRoute>
  );
}
