'use client';

import { useState, useMemo } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardShell } from '@/components/dashboard-shell';
import { useAuth } from '@/hooks/use-auth';
import { useSubscription } from '@/hooks/use-subscription';
import { isFreeUser } from '@/lib/paddle';
import { LockedOverlay } from '@/components/dashboard/locked-overlay';
import { useDashboardAnalytics } from '@/hooks/use-dashboard-analytics';
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
  const { analytics, isLoading, error } = useDashboardAnalytics({
    days: Number(timeRange),
    refetchInterval: 300_000,
    enabled: !!user && !isUserFree,
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

            {isUserFree && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                      <div>
                        <h3 className="font-semibold text-orange-900">
                          You're on the Free Plan
                        </h3>
                        <p className="text-sm text-orange-700">
                          Upgrade to unlock advanced analytics and insights.
                        </p>
                      </div>
                    </div>
                    <Button asChild>
                      <a href="/settings?tab=billing">
                        <ArrowUp className="mr-2 h-4 w-4" /> Upgrade Now
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="relative space-y-6">
              {isUserFree && <LockedOverlay />}
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
