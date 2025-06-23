'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, PhoneCall, PhoneIncoming, PhoneOff } from 'lucide-react';
import { useDashboardMetrics } from '@/hooks/use-dashboard-metrics';

export function StatsCards() {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 30);

  const { metrics, loading, error } = useDashboardMetrics(
    from.toISOString(),
    to.toISOString()
  );

  const total = metrics?.total ?? 0;
  const answered = metrics?.answered ?? 0;
  const missed = metrics?.missed ?? 0;
  const conversionRate = metrics ? Math.round(metrics.conversionRate * 100) : 0;

  const renderContent = (value: React.ReactNode, extra?: string) => {
    if (loading)
      return <div className="text-sm text-muted-foreground">Loading...</div>;
    if (error) return <div className="text-sm text-red-600">Error</div>;
    return (
      <>
        <div className="text-2xl font-bold">{value}</div>
        {extra && <p className="text-xs text-muted-foreground">{extra}</p>}
      </>
    );
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
          <PhoneCall className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>{renderContent(total, 'last 30 days')}</CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Answered by AI</CardTitle>
          <PhoneIncoming className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {renderContent(
            answered,
            total ? `${Math.round((answered / total) * 100)}% answer rate` : ''
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Missed Calls</CardTitle>
          <PhoneOff className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {renderContent(
            missed,
            total ? `${Math.round((missed / total) * 100)}% missed` : ''
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {renderContent(
            `${conversionRate}%`,
            answered ? `from ${answered} answered` : ''
          )}
        </CardContent>
      </Card>
    </div>
  );
}
