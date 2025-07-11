'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardShell } from '@/components/dashboard-shell';
import { useAuth } from '@/hooks/use-auth';
import { useSubscription } from '@/hooks/use-subscription';
import { useDashboardAnalytics } from '@/hooks/use-dashboard-analytics';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useActionPoints } from '@/hooks/use-action-points';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';

// Import dashboard components
import { AnalyticsTab } from '@/components/dashboard/analytics-tab';
import { CallDetailModal } from '@/components/dashboard/call-detail-modal';
import { AISettingsTab } from '@/components/dashboard/ai-settings-simple';

// Import icons
import { BarChart3, Settings, AlertCircle, ArrowUp } from 'lucide-react';

// Types
interface CallData {
  id: string;
  phoneNumber?: {
    number: string;
  };
  startedAt: string;
  endedAt?: string;
  endedReason: string;
  cost?: number;
  transcript?: string;
  recordingUrl?: string;
  analysis?: {
    sentiment?: string;
    leadQuality?: string;
    actionPoints?: string[];
  };
}

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

const ITEMS_PER_PAGE = 20;

export default function DashboardPage() {
  const { user } = useAuth();
  const { subscription, loading: subscriptionLoading } = useSubscription();

  // Analytics and call data
  const [timeRange, setTimeRange] = useState('30');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  // Pagination and filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('all');
  const [leadQualityFilter, setLeadQualityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // UI state
  const [selectedCall, setSelectedCall] = useState<CallData | null>(null);
  const [isCallDetailOpen, setIsCallDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('analytics');
  const [isBulkAnalyzing, setIsBulkAnalyzing] = useState(false);
  const [loadingCallDetails, setLoadingCallDetails] = useState(false);

  // Action points hook
  const { generateActionPoints } = useActionPoints();

  // Debounced search term for API efficiency
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

  // Check if user is on free plan
  const isUserFree = useMemo(() => {
    if (subscriptionLoading) return false;
    return !subscription || subscription.status !== 'active';
  }, [subscription, subscriptionLoading]);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    if (!user) return;

    try {
      setAnalyticsLoading(true);
      setAnalyticsError(null);

      const response = await fetch(
        `/api/vapi/analytics?timeRange=${timeRange}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch analytics');
      }

      setAnalytics(data);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to load analytics';
      setAnalyticsError(errorMessage);
      logger.error('DASHBOARD', 'Failed to fetch analytics', error as Error, {
        timeRange,
      });
    } finally {
      setAnalyticsLoading(false);
    }
  }, [user, timeRange]);

  // Client-side filtering and pagination of calls
  const filteredAndPaginatedCalls = useMemo(() => {
    if (!analytics?.recentCalls) return { calls: [], totalCalls: 0 };

    let filtered = analytics.recentCalls;

    // Apply search filter
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(
        call =>
          call.phoneNumber?.toLowerCase().includes(searchLower) ||
          call.callerName?.toLowerCase().includes(searchLower)
      );
    }

    // Apply sentiment filter
    if (sentimentFilter !== 'all') {
      filtered = filtered.filter(call => call.sentiment === sentimentFilter);
    }

    // Apply lead quality filter
    if (leadQualityFilter !== 'all') {
      filtered = filtered.filter(
        call => call.leadQuality === leadQualityFilter
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(call => call.endedReason === statusFilter);
    }

    // Calculate pagination
    const totalCalls = filtered.length;
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedCalls = filtered.slice(startIndex, endIndex);

    return { calls: paginatedCalls, totalCalls };
  }, [
    analytics?.recentCalls,
    debouncedSearchTerm,
    sentimentFilter,
    leadQualityFilter,
    statusFilter,
    currentPage,
  ]);

  // Calculate total pages
  const totalPages = Math.ceil(
    filteredAndPaginatedCalls.totalCalls / ITEMS_PER_PAGE
  );

  // Handle bulk analyze
  const handleBulkAnalyze = useCallback(async () => {
    if (!user) return;

    try {
      setIsBulkAnalyzing(true);

      const response = await fetch('/api/vapi/bulk-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ limit: 100 }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze calls');
      }

      toast({
        title: 'Analysis Complete',
        description: `Analyzed ${data.processed || 0} calls successfully. ${data.errors > 0 ? `${data.errors} errors occurred.` : ''}`,
      });

      // Refresh data after bulk analysis
      await fetchAnalytics();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to analyze calls';
      toast({
        title: 'Analysis Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      logger.error('DASHBOARD', 'Failed to bulk analyze calls', error as Error);
    } finally {
      setIsBulkAnalyzing(false);
    }
  }, [user, fetchAnalytics]);

  // Fetch call recording URL from VAPI
  const fetchCallRecording = useCallback(
    async (callId: string): Promise<string | null> => {
      try {
        const response = await fetch(
          `/api/vapi/call-recording?callId=${callId}`
        );

        if (!response.ok) {
          logger.warn('DASHBOARD', 'Failed to fetch call recording', {
            callId,
            status: response.status,
          });
          return null;
        }

        const data = await response.json();
        return data.recordingUrl || null;
      } catch (error) {
        logger.error(
          'DASHBOARD',
          'Error fetching call recording',
          error as Error,
          { callId }
        );
        return null;
      }
    },
    []
  );

  // Handle call selection with detailed data fetching
  const handleCallSelect = useCallback(
    async (call: CallData) => {
      setSelectedCall(call);
      setIsCallDetailOpen(true);
      setLoadingCallDetails(true);

      try {
        // Fetch additional call details in parallel
        const [recordingUrl, actionPoints] = await Promise.all([
          fetchCallRecording(call.id),
          generateActionPoints(call.id),
        ]);

        // Merge the additional details with the original call data
        const enrichedCall: CallData = {
          ...call,
          recordingUrl: recordingUrl || call.recordingUrl,
          analysis: {
            ...call.analysis,
            actionPoints: actionPoints
              ? [
                  ...(actionPoints.keyPoints || []),
                  ...(actionPoints.followUpItems || []),
                  ...(actionPoints.urgentConcerns || []),
                ]
              : call.analysis?.actionPoints || [],
          },
        };

        setSelectedCall(enrichedCall);
      } catch (error) {
        logger.error(
          'DASHBOARD',
          'Failed to fetch detailed call information',
          error as Error,
          { callId: call.id }
        );
        toast({
          title: 'Error Loading Call Details',
          description: 'Some call details may not be available.',
          variant: 'destructive',
        });
      } finally {
        setLoadingCallDetails(false);
      }
    },
    [fetchCallRecording, generateActionPoints]
  );

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearchTerm,
    sentimentFilter,
    leadQualityFilter,
    statusFilter,
    timeRange,
  ]);

  // Initial data fetch
  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, fetchAnalytics]);

  // Auto-refresh data every 30 seconds for real-time updates
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      if (!isBulkAnalyzing) {
        fetchAnalytics();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [user, fetchAnalytics, isBulkAnalyzing]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardShell>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p>Loading...</p>
              </div>
            </CardContent>
          </Card>
        </DashboardShell>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <DashboardShell>
          <div className="mx-auto max-w-7xl space-y-6 py-6">
            {/* Free Tier Banner */}
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
                          Upgrade to unlock advanced analytics, unlimited AI
                          settings, and premium features.
                        </p>
                      </div>
                    </div>
                    <Button asChild>
                      <a href="/billing">
                        <ArrowUp className="mr-2 h-4 w-4" />
                        Upgrade Now
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Main Content Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-6"
            >
              <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:grid-cols-2">
                <TabsTrigger
                  value="analytics"
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger
                  value="ai-settings"
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  AI Settings
                </TabsTrigger>
              </TabsList>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-6">
                <AnalyticsTab
                  analytics={analytics}
                  isLoading={analyticsLoading}
                  error={analyticsError}
                  timeRange={timeRange}
                  onTimeRangeChange={setTimeRange}
                  isUserFree={isUserFree}
                  onBulkAnalyze={handleBulkAnalyze}
                  isBulkAnalyzing={isBulkAnalyzing}
                  calls={filteredAndPaginatedCalls.calls}
                  callsLoading={analyticsLoading}
                  callsError={analyticsError}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  sentimentFilter={sentimentFilter}
                  onSentimentFilterChange={setSentimentFilter}
                  leadQualityFilter={leadQualityFilter}
                  onLeadQualityFilterChange={setLeadQualityFilter}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  selectedCallId={selectedCall?.id || null}
                  onCallSelect={handleCallSelect}
                />
              </TabsContent>

              {/* AI Settings Tab */}
              <TabsContent value="ai-settings">
                <AISettingsTab isUserFree={isUserFree} />
              </TabsContent>
            </Tabs>

            {/* Call Detail Modal */}
            <CallDetailModal
              call={selectedCall}
              isOpen={isCallDetailOpen}
              onClose={() => setIsCallDetailOpen(false)}
            />
          </div>
        </DashboardShell>
      </div>
    </ProtectedRoute>
  );
}
