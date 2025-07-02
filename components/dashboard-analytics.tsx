import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CallMetrics } from '@/lib/types';
import {
  PhoneCall,
  CheckCircle,
  XCircle,
  Timer,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Target,
  Heart,
  Clock,
} from 'lucide-react';
import { logger } from '@/lib/logger';

interface DashboardAnalyticsProps {
  metrics: CallMetrics;
  trends: {
    callVolumeTrend: 'up' | 'down' | 'stable';
    avgDurationTrend: 'up' | 'down' | 'stable';
    costTrend: 'up' | 'down' | 'stable';
  };
}

export function DashboardAnalytics({
  metrics,
  trends,
}: DashboardAnalyticsProps) {
  // Debugging: Log the metrics received by DashboardAnalytics component
  useEffect(() => {
    if (metrics) {
      logger.info(
        'DASHBOARD_ANALYTICS_COMPONENT',
        'Metrics received by component',
        {
          totalCalls: metrics.totalCalls,
          answeredCalls: metrics.answeredCalls,
        }
      );
    }
  }, [metrics]);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const answerRate =
    metrics.totalCalls > 0
      ? ((metrics.answeredCalls / metrics.totalCalls) * 100).toFixed(1)
      : '0';

  return (
    <div className="space-y-6">
      {/* Main Metrics Row */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="rounded-lg bg-blue-100 p-2">
                  <PhoneCall className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Calls
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {metrics.totalCalls}
                  </p>
                </div>
              </div>
              <div
                className={`flex items-center ${getTrendColor(trends.callVolumeTrend)}`}
              >
                {getTrendIcon(trends.callVolumeTrend)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="rounded-lg bg-green-100 p-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Answered
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-foreground">
                    {metrics.answeredCalls}
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    {answerRate}%
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="rounded-lg bg-purple-100 p-2">
                  <Timer className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Avg Duration
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatDuration(Math.round(metrics.avgDuration))}
                  </p>
                </div>
              </div>
              <div
                className={`flex items-center ${getTrendColor(trends.avgDurationTrend)}`}
              >
                {getTrendIcon(trends.avgDurationTrend)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="rounded-lg bg-green-100 p-2">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Cost
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    ${metrics.totalCost.toFixed(2)}
                  </p>
                </div>
              </div>
              <div
                className={`flex items-center ${getTrendColor(trends.costTrend)}`}
              >
                {getTrendIcon(trends.costTrend)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Heart className="h-5 w-5" />
              Call Sentiment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  <span className="text-sm text-muted-foreground">
                    Positive
                  </span>
                </div>
                <span className="font-medium">
                  {metrics.sentimentDistribution.positive}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-gray-400"></div>
                  <span className="text-sm text-muted-foreground">Neutral</span>
                </div>
                <span className="font-medium">
                  {metrics.sentimentDistribution.neutral}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500"></div>
                  <span className="text-sm text-muted-foreground">
                    Negative
                  </span>
                </div>
                <span className="font-medium">
                  {metrics.sentimentDistribution.negative}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5" />
              Lead Quality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500"></div>
                  <span className="text-sm text-muted-foreground">Hot</span>
                </div>
                <span className="font-medium">
                  {metrics.leadQualityDistribution.hot}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                  <span className="text-sm text-muted-foreground">Warm</span>
                </div>
                <span className="font-medium">
                  {metrics.leadQualityDistribution.warm}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-muted-foreground">Cold</span>
                </div>
                <span className="font-medium">
                  {metrics.leadQualityDistribution.cold}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              Peak Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.callsByHour
                .filter(h => h.count > 0)
                .sort((a, b) => b.count - a.count)
                .slice(0, 3)
                .map((hour, index) => (
                  <div
                    key={hour.hour}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-3 w-3 rounded-full ${
                          index === 0
                            ? 'bg-blue-500'
                            : index === 1
                              ? 'bg-blue-400'
                              : 'bg-blue-300'
                        }`}
                      ></div>
                      <span className="text-sm text-muted-foreground">
                        {hour.hour.toString().padStart(2, '0')}:00
                      </span>
                    </div>
                    <span className="font-medium">{hour.count} calls</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call Volume by Day Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Weekly Call Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {metrics.callsByDay.map(day => {
              const maxCalls = Math.max(
                ...metrics.callsByDay.map(d => d.count)
              );
              const height = maxCalls > 0 ? (day.count / maxCalls) * 100 : 0;

              return (
                <div key={day.day} className="text-center">
                  <div className="mb-2 flex h-24 items-end justify-center">
                    <div
                      className="w-8 rounded-t bg-blue-500"
                      style={{
                        height: `${height}%`,
                        minHeight: day.count > 0 ? '4px' : '0',
                      }}
                    ></div>
                  </div>
                  <div className="text-xs font-medium text-muted-foreground">
                    {day.day.slice(0, 3)}
                  </div>
                  <div className="text-sm font-bold text-foreground">
                    {day.count}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
