'use client';

// NOTE: This file contains the original client-side dashboard implementation that was previously
// in `app/dashboard/page.tsx`. The code is moved here unchanged (except for import paths) so
// that it can be lazy-loaded from the new server component wrapper. This achieves a significant
// bundle‐size reduction for routes that do not need the dashboard.

// BEGIN ORIGINAL IMPLEMENTATION

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
import { Card, CardContent } from '@/components/ui/card';
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
import { AlertCircle, ArrowUp, BarChart3, Settings } from 'lucide-react';

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

// Reducer for filters + pagination
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

export default function DashboardClient() {
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

  // Determine if user is free tier
  const isUserFree = useMemo(() => {
    if (subscriptionLoading) return false;
    return isFreeUser(subscription);
  }, [subscriptionLoading, subscription]);

  // UI state
  const [selectedCall, setSelectedCall] = useState<CallData | null>(null);
  const [isCallDetailOpen, setIsCallDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('analytics');
  // Remove isBulkAnalyzing state since automatic analysis is now handled via webhook
  // const [isBulkAnalyzing, setIsBulkAnalyzing] = useState(false);

  // Analytics hook
  const { analytics, isLoading, error, refetch } = useDashboardAnalytics({
    days: Number(timeRange),
    refetchInterval: 300_000, // 5 minutes after optimisation
    // Remove isBulkAnalyzing dependency since automatic analysis is now handled via webhook
    enabled: !!user && !isCallDetailOpen && !isUserFree,
  });

  // Action points
  const { generateActionPoints } = useActionPoints();

  // Debounced search
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

  // Filtering & pagination
  const filteredAndPaginatedCalls = useMemo(() => {
    if (!analytics?.recentCalls) return { calls: [], totalCalls: 0 };

    let filtered = analytics.recentCalls;

    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(
        call =>
          call.phoneNumber?.number?.toLowerCase().includes(searchLower) ||
          call.callerName?.toLowerCase().includes(searchLower)
      );
    }

    if (sentimentFilter !== 'all') {
      filtered = filtered.filter(
        call => call.analysis?.sentiment === sentimentFilter
      );
    }

    if (leadQualityFilter !== 'all') {
      filtered = filtered.filter(
        call => call.analysis?.leadQuality === leadQualityFilter
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(call => call.endedReason === statusFilter);
    }

    const totalCalls = filtered.length;
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedCalls = filtered.slice(
      startIndex,
      startIndex + ITEMS_PER_PAGE
    );

    return { calls: paginatedCalls, totalCalls };
  }, [
    analytics?.recentCalls,
    debouncedSearchTerm,
    sentimentFilter,
    leadQualityFilter,
    statusFilter,
    currentPage,
  ]);

  const totalPages = Math.ceil(
    filteredAndPaginatedCalls.totalCalls / ITEMS_PER_PAGE
  );

  // Remove bulk analyze handler since automatic analysis is now handled via webhook
  // const handleBulkAnalyze = useCallback(async () => {
  //   if (!user) return;
  //   try {
  //     setIsBulkAnalyzing(true);
  //     const res = await fetch('/api/vapi/bulk-analyze', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ limit: 100 }),
  //     });
  //     const data = await res.json();
  //     if (!res.ok) throw new Error(data.error || 'Failed');
  //     toast({
  //       title: 'Analysis complete',
  //       description: `Analyzed ${data.processed || 0} calls.`,
  //     });
  //     await refetch();
  //   } catch (err) {
  //     toast({
  //       title: 'Bulk analyze failed',
  //       description: err instanceof Error ? err.message : String(err),
  //       variant: 'destructive',
  //     });
  //   } finally {
  //     setIsBulkAnalyzing(false);
  //   }
  // }, [user, refetch]);

  // Fetch recording helper
  const fetchCallRecording = useCallback(async (callId: string) => {
    try {
      const r = await fetch(`/api/vapi/call-recording?callId=${callId}`);
      if (!r.ok) return null;
      const d = await r.json();
      return d.recordingUrl || null;
    } catch {
      return null;
    }
  }, []);

  // Call select handler
  const handleCallSelect = useCallback(
    async (call: VapiCall) => {
      setSelectedCall(call);
      setIsCallDetailOpen(true);
      try {
        const [recordingUrl, actionPoints] = await Promise.all([
          fetchCallRecording(call.id),
          generateActionPoints(call.id),
        ]);
        setSelectedCall({
          ...call,
          recordingUrl: recordingUrl || call.recordingUrl,
          // Preserve original analysis but enrich it with sentiment and flattened action points for backward-compat
          analysis: {
            ...call.analysis,
            sentiment: actionPoints?.sentiment || call.analysis?.sentiment,
            actionPoints: actionPoints
              ? [
                  ...(actionPoints.keyPoints || []),
                  ...(actionPoints.followUpItems || []),
                  ...(actionPoints.urgentConcerns || []),
                ]
              : call.analysis?.actionPoints || [],
          },
          // Attach full structured action points for detailed modal rendering
          actionPoints: actionPoints || call.actionPoints,
        });
      } catch (err) {
        logger.error('DASHBOARD', 'Error fetching call details', err as Error);
      }
    },
    [fetchCallRecording, generateActionPoints]
  );

  // Pagination & filter helpers
  const handlePageChange = (p: number) =>
    dispatchFilters({ type: 'SET_PAGE', page: p });
  const handleSearchChange = (v: string) =>
    startTransition(() => dispatchFilters({ type: 'SET_SEARCH', term: v }));
  const handleSentimentChange = (v: string) =>
    dispatchFilters({ type: 'SET_SENTIMENT', value: v });
  const handleLeadChange = (v: string) =>
    dispatchFilters({ type: 'SET_LEAD', value: v });
  const handleStatusChange = (v: string) =>
    dispatchFilters({ type: 'SET_STATUS', value: v });

  if (!user) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <DashboardShell>
          <div className="mx-auto max-w-7xl space-y-6 py-6">
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
                          Upgrade to unlock advanced analytics.
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

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-6"
            >
              <TabsList className="grid w-full grid-cols-2 lg:w-auto">
                <TabsTrigger
                  value="analytics"
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" /> Analytics
                </TabsTrigger>
                <TabsTrigger
                  value="ai-settings"
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" /> AI Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="analytics" className="relative space-y-6">
                {isUserFree && <LockedOverlay />}
                <Suspense
                  fallback={<div className="p-6">Loading analytics…</div>}
                >
                  <AnalyticsTab
                    analytics={analytics as AnalyticsData | null}
                    isLoading={isLoading}
                    error={error ? (error as Error).message : null}
                    timeRange={timeRange}
                    onTimeRangeChange={setTimeRange}
                    isUserFree={isUserFree}
                    // Remove bulk analyze props since automatic analysis is now handled via webhook
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

              {/* Keep the AI Settings tab mounted so it doesn’t reload every time */}
              <TabsContent value="ai-settings" forceMount>
                <AISettingsTab isUserFree={isUserFree} />
              </TabsContent>
            </Tabs>

            <CallDetailModal
              call={selectedCall}
              isOpen={isCallDetailOpen}
              onClose={() => {
                setIsCallDetailOpen(false);
                setSelectedCall(null);
              }}
            />
          </div>
        </DashboardShell>
      </div>
    </ProtectedRoute>
  );
}

// END ORIGINAL IMPLEMENTATION
