import React from 'react';
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

interface DashboardAnalyticsProps {
  metrics: CallMetrics;
  trends: {
    callVolumeTrend: 'up' | 'down' | 'stable';
    avgDurationTrend: 'up' | 'down' | 'stable';
    costTrend: 'up' | 'down' | 'stable';
  };
}

export function DashboardAnalytics({ metrics, trends }: DashboardAnalyticsProps) {
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-600" />;
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

  const answerRate = metrics.totalCalls > 0 
    ? ((metrics.answeredCalls / metrics.totalCalls) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Main Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <PhoneCall className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Calls</p>
                  <p className="text-2xl font-bold text-foreground">{metrics.totalCalls}</p>
                </div>
              </div>
              <div className={`flex items-center ${getTrendColor(trends.callVolumeTrend)}`}>
                {getTrendIcon(trends.callVolumeTrend)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Answered</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-foreground">{metrics.answeredCalls}</p>
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
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Timer className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Avg Duration</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatDuration(Math.round(metrics.avgDuration))}
                  </p>
                </div>
              </div>
              <div className={`flex items-center ${getTrendColor(trends.avgDurationTrend)}`}>
                {getTrendIcon(trends.avgDurationTrend)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${metrics.totalCost.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className={`flex items-center ${getTrendColor(trends.costTrend)}`}>
                {getTrendIcon(trends.costTrend)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Call Sentiment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">Positive</span>
                </div>
                <span className="font-medium">{metrics.sentimentDistribution.positive}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">Neutral</span>
                </div>
                <span className="font-medium">{metrics.sentimentDistribution.neutral}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">Negative</span>
                </div>
                <span className="font-medium">{metrics.sentimentDistribution.negative}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5" />
              Lead Quality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">Hot</span>
                </div>
                <span className="font-medium">{metrics.leadQualityDistribution.hot}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">Warm</span>
                </div>
                <span className="font-medium">{metrics.leadQualityDistribution.warm}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">Cold</span>
                </div>
                <span className="font-medium">{metrics.leadQualityDistribution.cold}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" />
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
                  <div key={hour.hour} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        index === 0 ? 'bg-blue-500' : 
                        index === 1 ? 'bg-blue-400' : 'bg-blue-300'
                      }`}></div>
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
            <Users className="w-5 h-5" />
            Weekly Call Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {metrics.callsByDay.map((day) => {
              const maxCalls = Math.max(...metrics.callsByDay.map(d => d.count));
              const height = maxCalls > 0 ? (day.count / maxCalls) * 100 : 0;
              
              return (
                <div key={day.day} className="text-center">
                  <div className="h-24 flex items-end justify-center mb-2">
                    <div 
                      className="w-8 bg-blue-500 rounded-t"
                      style={{ height: `${height}%`, minHeight: day.count > 0 ? '4px' : '0' }}
                    ></div>
                  </div>
                  <div className="text-xs text-muted-foreground font-medium">
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