'use client';

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useReducer,
  startTransition,
} from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DashboardShell } from '@/components/dashboard-shell';
import { useAuth } from '@/hooks/use-auth';
import { useSubscription } from '@/hooks/use-subscription';
import { isFreeUser } from '@/lib/paddle';
import { LockedOverlay } from '@/components/dashboard/locked-overlay';
import { useDashboardAnalytics } from '@/hooks/use-dashboard-analytics';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useActionPoints } from '@/hooks/use-action-points';
import { useCallUpdates } from '@/hooks/use-call-updates';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';
import { VapiCall } from '@/lib/types';
import { AlertCircle, ArrowUp } from 'lucide-react';
import { CallDetailModal } from '@/components/dashboard/call-detail-modal';
import { CallHistoryTable } from '@/components/dashboard/call-history-table';
import { useSearchParams, useRouter } from 'next/navigation';

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

export default function RecentCallsClient() {
  const { user } = useAuth();
  const { subscription, loading: subscriptionLoading } = useSubscription();
  const searchParams = useSearchParams();
  const router = useRouter();

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
  const [selectedCall, setSelectedCall] = useState<VapiCall | null>(null);
  const [isCallDetailOpen, setIsCallDetailOpen] = useState(false);

  // Analytics hook for calls data - hybrid mode: initial load + events only
  const { analytics, isLoading, error, refetch, hasCachedData } =
    useDashboardAnalytics({
      days: 30,
      refetchInterval: 0, // No polling - pure event-driven after initial load
      enabled: !!user && !isCallDetailOpen && !isUserFree,
    });

  // Action points
  const { generateActionPoints } = useActionPoints();

  // Real-time call updates
  const { isConnected: isRealTimeConnected } = useCallUpdates({
    enabled: !!user && !isUserFree,
    onNewCall: useCallback(
      (event: import('@/lib/events').CallUpdateEvent) => {
        logger.info('RECENT_CALLS', 'New call detected via SSE', {
          callId: event.callId,
          timestamp: event.timestamp,
          hasCallData: !!event.callData,
          hasAnalysis: !!event.callData?.analysis,
        });

        // Show enhanced toast notification with call details
        const callerInfo =
          event.callData?.callerName ||
          event.callData?.phoneNumber ||
          'Unknown caller';
        const leadQuality =
          event.callData?.analysis?.structuredData?.leadQuality;
        const sentiment = event.callData?.analysis?.structuredData?.sentiment;

        toast({
          title: 'New Call Received',
          description: `${callerInfo}${leadQuality ? ` - ${leadQuality.toUpperCase()} lead` : ''}${sentiment ? ` - ${sentiment} sentiment` : ''}`,
          duration: 8000,
          action: (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Reset filters and go to first page to show the new call
                dispatchFilters({ type: 'SET_SEARCH', term: '' });
                dispatchFilters({ type: 'SET_SENTIMENT', value: 'all' });
                dispatchFilters({ type: 'SET_LEAD', value: 'all' });
                dispatchFilters({ type: 'SET_STATUS', value: 'all' });
                dispatchFilters({ type: 'SET_PAGE', page: 1 });
              }}
            >
              View
            </Button>
          ),
        });

        // Immediately refetch analytics data since we have the call data from webhook
        // No delay needed since VAPI has already processed and sent us the analysis
        logger.info(
          'RECENT_CALLS',
          'Refreshing call data after new call detected'
        );
        refetch();
      },
      [refetch]
    ),
  });

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
          actionPoints: actionPoints || call.actionPoints,
        });
      } catch (err) {
        logger.error(
          'RECENT_CALLS',
          'Error fetching call details',
          err as Error
        );
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

  // Handle payment success from Paddle redirect
  useEffect(() => {
    const payment = searchParams.get('payment');
    if (payment === 'success') {
      toast({
        title: 'Payment successful!',
        description: 'Welcome to Spoqen! Your subscription is now active.',
        duration: 6000,
      });

      // Clean up the URL by removing the payment parameter
      const currentParams = new URLSearchParams(window.location.search);
      currentParams.delete('payment');
      router.replace(`${window.location.pathname}?${currentParams.toString()}`);
    }
  }, [searchParams, router]);

  if (!user) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <DashboardShell>
          <div className="mx-auto max-w-7xl space-y-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold">Recent Calls</h1>
                {!isUserFree && (
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        isRealTimeConnected ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    />
                    <span className="text-sm text-muted-foreground">
                      {isRealTimeConnected ? 'Live updates' : 'Connecting...'}
                    </span>
                  </div>
                )}
              </div>
            </div>

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
                          Upgrade to view your call history and details.
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
              <CallHistoryTable
                calls={filteredAndPaginatedCalls.calls}
                isLoading={isLoading}
                error={error ? (error as Error).message : null}
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
            </div>

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
