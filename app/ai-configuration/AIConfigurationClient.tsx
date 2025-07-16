'use client';

import { useMemo } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { DashboardShell } from '@/components/dashboard-shell';
import { useAuth } from '@/hooks/use-auth';
import { useSubscription } from '@/hooks/use-subscription';
import { isFreeUser } from '@/lib/paddle';
import { AISettingsTab } from '@/components/dashboard/ai-settings-simple';

export default function AIConfigurationClient() {
  const { user } = useAuth();
  const { subscription, loading: subscriptionLoading } = useSubscription();

  // Determine if user is free tier
  const isUserFree = useMemo(() => {
    if (subscriptionLoading) return false;
    return isFreeUser(subscription);
  }, [subscriptionLoading, subscription]);

  if (!user) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <DashboardShell>
          <div className="mx-auto max-w-7xl space-y-6 py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">AI Configuration</h1>
            </div>

            <AISettingsTab isUserFree={isUserFree} />
          </div>
        </DashboardShell>
      </div>
    </ProtectedRoute>
  );
}
