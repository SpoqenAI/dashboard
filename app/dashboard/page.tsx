'use client';

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useReducer,
  startTransition,
  Suspense,
} from 'react';
import dynamic from 'next/dynamic';
import { ProtectedRoute } from '@/components/protected-route';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardShell } from '@/components/dashboard-shell';
import { useAuth } from '@/hooks/use-auth';
import { useSubscription } from '@/hooks/use-subscription';
import { isFreeUser } from '@/lib/paddle';
import { LockedOverlay } from '@/components/dashboard/locked-overlay';
import { useDashboardAnalytics } from '@/hooks/use-dashboard-analytics';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useActionPoints } from '@/hooks/use-action-points';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';
import { VapiCall } from '@/lib/types';

// Lazy-load heavy dashboard tabs to trim initial JS (perf optim)
const AnalyticsTab = dynamic(
  () =>
    import('@/components/dashboard/analytics-tab').then(m => m.AnalyticsTab),
  { ssr: false, loading: () => <div className="p-6">Loading analytics…</div> }
);

const AISettingsTab = dynamic(
  () =>
    import('@/components/dashboard/ai-settings-simple').then(
      m => m.AISettingsTab
    ),
  { ssr: false, loading: () => <div className="p-6">Loading settings…</div> }
);

import { CallDetailModal } from '@/components/dashboard/call-detail-modal';

// Import icons
import { BarChart3, Settings, AlertCircle, ArrowUp } from 'lucide-react';

// Types
type CallData = VapiCall;

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

// --------------------------------------------------
// Reducer for filters + pagination (single source of truth)
// --------------------------------------------------
interface FilterState {
  currentPage: number;
  searchTerm: string;
  sentiment: string;
  leadQuality: string;
  status: string;
}

type FilterAction =
  | { type: 'SET_PAGE'; page: number }
  | { type: 'SET_SEARCH'; term: string }
  | { type: 'SET_SENTIMENT'; value: string }
  | { type: 'SET_LEAD'; value: string }
  | { type: 'SET_STATUS'; value: string };

const initialFilters: FilterState = {
  currentPage: 1,
  searchTerm: '',
  sentiment: 'all',
  leadQuality: 'all',
  status: 'all',
};

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case 'SET_PAGE':
      return { ...state, currentPage: action.page };
    case 'SET_SEARCH':
      return { ...state, searchTerm: action.term, currentPage: 1 };
    case 'SET_SENTIMENT':
      return { ...state, sentiment: action.value, currentPage: 1 };
    case 'SET_LEAD':
      return { ...state, leadQuality: action.value, currentPage: 1 };
    case 'SET_STATUS':
      return { ...state, status: action.value, currentPage: 1 };
    default:
      return state;
  }
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { subscription, loading: subscriptionLoading } = useSubscription();

  // Analytics time range
  const [timeRange, setTimeRange] = useState('30');

  // Unified filter state
  const [filters, dispatchFilters] = useReducer(filterReducer, initialFilters);

  const {
    currentPage,
    searchTerm,
    sentiment: sentimentFilter,
    leadQuality: leadQualityFilter,
    status: statusFilter,
  } = filters;

  // --------------------------------------------------
  // Determine if the current user should see the locked/teaser dashboard
  // (Placed early so that subsequent hooks can rely on the value)
  // --------------------------------------------------
  const isUserFree = useMemo(() => {
    if (subscriptionLoading) return false; // Wait until subscription state is known
    return isFreeUser(subscription);
  }, [subscriptionLoading, subscription]);

  // UI state
  const [selectedCall, setSelectedCall] = useState<CallData | null>(null);
  const [isCallDetailOpen, setIsCallDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('analytics');
  const [isBulkAnalyzing, setIsBulkAnalyzing] = useState(false);
  const [loadingCallDetails, setLoadingCallDetails] = useState(false);

  // Use SWR-powered analytics hook for better caching and error handling
  const { analytics, isLoading, error, refetch } = useDashboardAnalytics({
    days: Number(timeRange),
    refetchInterval: 30000,
    // Do NOT fetch analytics from VAPI for free users to avoid unnecessary calls
    enabled: !!user && !isBulkAnalyzing && !isCallDetailOpen && !isUserFree,
  });

  // Action points hook
  const { generateActionPoints } = useActionPoints();

  // Debounced search term for API efficiency
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

  // Client-side filtering and pagination of calls
  const filteredAndPaginatedCalls = useMemo(() => {
    if (!analytics?.recentCalls) return { calls: [], totalCalls: 0 };

    let filtered = analytics.recentCalls;

    // Apply search filter
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(
        call =>
          call.phoneNumber?.number?.toLowerCase().includes(searchLower) ||
          call.callerName?.toLowerCase().includes(searchLower)
      );
    }

    // Apply sentiment filter
    if (sentimentFilter !== 'all') {
      filtered = filtered.filter(
        call => call.analysis?.sentiment === sentimentFilter
      );
    }

    // Apply lead quality filter
    if (leadQualityFilter !== 'all') {
      filtered = filtered.filter(
        call => call.analysis?.leadQuality === leadQualityFilter
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
      await refetch();
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
  }, [user, refetch]);

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
    async (call: VapiCall) => {
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
    dispatchFilters({ type: 'SET_PAGE', page });
  }, []);

  // Reset page when filters change now handled in reducer

  // Search change with startTransition
  const handleSearchChange = (val: string) => {
    startTransition(() => dispatchFilters({ type: 'SET_SEARCH', term: val }));
  };

  // Handlers for other filters
  const handleSentimentChange = (v: string) =>
    dispatchFilters({ type: 'SET_SENTIMENT', value: v });
  const handleLeadChange = (v: string) =>
    dispatchFilters({ type: 'SET_LEAD', value: v });
  const handleStatusChange = (v: string) =>
    dispatchFilters({ type: 'SET_STATUS', value: v });

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
              <TabsContent value="analytics" className="relative space-y-6">
                {/* Locked overlay shown only for free-tier users */}
                {isUserFree && <LockedOverlay />}

                <Suspense
                  fallback={<div className="p-6">Loading analytics…</div>}
                >
                  <AnalyticsTab
                    analytics={analytics}
                    isLoading={isLoading}
                    error={error ? (error as Error).message : null}
                    timeRange={timeRange}
                    onTimeRangeChange={setTimeRange}
                    isUserFree={isUserFree}
                    onBulkAnalyze={handleBulkAnalyze}
                    isBulkAnalyzing={isBulkAnalyzing}
                    calls={filteredAndPaginatedCalls.calls}
                    callsLoading={isLoading}
                    callsError={error ? (error as Error).message : null}
                    searchTerm={searchTerm}
                    onSearchChange={handleSearchChange}
                    sentimentFilter={sentimentFilter}
                    onSentimentFilterChange={handleSentimentChange}
                    leadQualityFilter={leadQualityFilter}
                    onLeadQualityFilterChange={handleLeadChange}
                    statusFilter={statusFilter}
                    onStatusFilterChange={handleStatusChange}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    selectedCallId={selectedCall?.id || null}
                    onCallSelect={handleCallSelect}
                  />
                </Suspense>
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
