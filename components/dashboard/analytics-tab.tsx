import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ModernStatsCard } from '@/components/modern-stats-card';
import { formatDuration } from './dashboard-helpers';
// Pure analytics presentation component - no call data dependencies
import {
  Phone,
  PhoneCall,
  Clock,
  DollarSign,
  TrendingUp,
  BarChart3,
  AlertCircle,
  Calendar,
} from 'lucide-react';

// Define interfaces for analytics data
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
}

interface AnalyticsTabProps {
  analytics: AnalyticsData | null;
  isLoading: boolean;
  error: string | null;
  timeRange: string;
  onTimeRangeChange: (value: string) => void;
  isUserFree: boolean;
}

export const AnalyticsTab = memo(
  ({
    analytics,
    isLoading,
    error,
    timeRange,
    onTimeRangeChange,
    isUserFree,
  }: AnalyticsTabProps) => {
    // Calculate derived metrics
    const derivedMetrics = useMemo(() => {
      if (!analytics?.metrics) return null;

      const {
        totalCalls,
        answeredCalls,
        totalCost,
        sentimentDistribution,
        leadQualityDistribution,
      } = analytics.metrics;

      // Ensure distributions exist with default values
      const safeSentimentDistribution = {
        positive: sentimentDistribution?.positive || 0,
        neutral: sentimentDistribution?.neutral || 0,
        negative: sentimentDistribution?.negative || 0,
      };

      const safeLeadQualityDistribution = {
        hot: leadQualityDistribution?.hot || 0,
        warm: leadQualityDistribution?.warm || 0,
        cold: leadQualityDistribution?.cold || 0,
      };

      const totalSentimentCalls =
        safeSentimentDistribution.positive +
        safeSentimentDistribution.neutral +
        safeSentimentDistribution.negative;
      const totalLeadCalls =
        safeLeadQualityDistribution.hot +
        safeLeadQualityDistribution.warm +
        safeLeadQualityDistribution.cold;

      return {
        answerRate:
          totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0,
        costPerCall: totalCalls > 0 ? totalCost / totalCalls : 0,
        totalSentimentCalls,
        totalLeadCalls,
        positiveRate:
          totalSentimentCalls > 0
            ? Math.round(
                (safeSentimentDistribution.positive / totalSentimentCalls) * 100
              )
            : 0,
        hotLeadRate:
          totalLeadCalls > 0
            ? Math.round(
                (safeLeadQualityDistribution.hot / totalLeadCalls) * 100
              )
            : 0,
        sentimentDistribution: safeSentimentDistribution,
        leadQualityDistribution: safeLeadQualityDistribution,
      };
    }, [analytics]);

    const formatCurrency = (amount: number): string => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      }).format(amount);
    };

    const getTimeRangeLabel = (range: string): string => {
      switch (range) {
        case '7':
          return 'Last 7 days';
        case '30':
          return 'Last 30 days';
        case '90':
          return 'Last 90 days';
        default:
          return 'All time';
      }
    };

    if (error) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load analytics: {error}</AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header with Time Range Filter */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold">Analytics Overview</h2>
            <p className="text-muted-foreground">
              Insights into your call performance and trends
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={onTimeRangeChange}>
              <SelectTrigger className="w-40">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Free User Notice */}
        {isUserFree && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You're on the free plan with limited analytics.
              <Button variant="link" className="ml-1 h-auto p-0">
                Upgrade for advanced insights
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : analytics?.metrics && derivedMetrics ? (
            <>
              <ModernStatsCard
                title="Total Calls"
                value={analytics.metrics.totalCalls.toString()}
                change={getTimeRangeLabel(timeRange)}
                icon={Phone}
              />

              <ModernStatsCard
                title="Answer Rate"
                value={`${derivedMetrics.answerRate}%`}
                change={`${analytics.metrics.answeredCalls} of ${analytics.metrics.totalCalls} calls`}
                icon={PhoneCall}
              />

              <ModernStatsCard
                title="Avg Duration"
                value={formatDuration(analytics.metrics.avgDuration)}
                change="Per answered call"
                icon={Clock}
              />

              <ModernStatsCard
                title="Total Cost"
                value={formatCurrency(analytics.metrics.totalCost)}
                change={`${formatCurrency(derivedMetrics.costPerCall)} per call`}
                icon={DollarSign}
              />
            </>
          ) : (
            <div className="col-span-full">
              <Card>
                <CardContent className="p-8 text-center">
                  <BarChart3 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-semibold">
                    No data available
                  </h3>
                  <p className="text-muted-foreground">
                    Analytics will appear here once you start receiving calls.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Sentiment & Lead Quality Analysis */}
        {analytics &&
          derivedMetrics &&
          (derivedMetrics.totalSentimentCalls > 0 ||
            derivedMetrics.totalLeadCalls > 0) && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Sentiment Analysis */}
              {derivedMetrics.totalSentimentCalls > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Sentiment Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">
                          {derivedMetrics.positiveRate}%
                        </span>
                        <Badge variant="secondary">
                          {derivedMetrics.totalSentimentCalls} calls analyzed
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-green-500" />
                            <span className="text-sm">Positive</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {derivedMetrics.sentimentDistribution.positive}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              (
                              {Math.round(
                                (derivedMetrics.sentimentDistribution.positive /
                                  derivedMetrics.totalSentimentCalls) *
                                  100
                              )}
                              %)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-yellow-500" />
                            <span className="text-sm">Neutral</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {derivedMetrics.sentimentDistribution.neutral}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              (
                              {Math.round(
                                (derivedMetrics.sentimentDistribution.neutral /
                                  derivedMetrics.totalSentimentCalls) *
                                  100
                              )}
                              %)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-red-500" />
                            <span className="text-sm">Negative</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {derivedMetrics.sentimentDistribution.negative}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              (
                              {Math.round(
                                (derivedMetrics.sentimentDistribution.negative /
                                  derivedMetrics.totalSentimentCalls) *
                                  100
                              )}
                              %)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Lead Quality Analysis */}
              {derivedMetrics.totalLeadCalls > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Lead Quality
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">
                          {derivedMetrics.hotLeadRate}%
                        </span>
                        <Badge variant="secondary">
                          {derivedMetrics.totalLeadCalls} leads scored
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-red-500" />
                            <span className="text-sm">Hot</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {derivedMetrics.leadQualityDistribution.hot}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              (
                              {Math.round(
                                (derivedMetrics.leadQualityDistribution.hot /
                                  derivedMetrics.totalLeadCalls) *
                                  100
                              )}
                              %)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-orange-500" />
                            <span className="text-sm">Warm</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {derivedMetrics.leadQualityDistribution.warm}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              (
                              {Math.round(
                                (derivedMetrics.leadQualityDistribution.warm /
                                  derivedMetrics.totalLeadCalls) *
                                  100
                              )}
                              %)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-blue-500" />
                            <span className="text-sm">Cold</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {derivedMetrics.leadQualityDistribution.cold}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              (
                              {Math.round(
                                (derivedMetrics.leadQualityDistribution.cold /
                                  derivedMetrics.totalLeadCalls) *
                                  100
                              )}
                              %)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
      </div>
    );
  }
);

AnalyticsTab.displayName = 'AnalyticsTab';
