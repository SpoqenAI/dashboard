'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Filter as BadWordsFilter } from 'bad-words';
import {
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Search,
  Calendar,
  AlertTriangle,
  FileText,
  Filter as FilterIcon,
  TrendingUp,
  Users,
  PhoneCall,
  Timer,
  Lightbulb,
  ListTodo,
  Heart,
  Loader2,
  RefreshCw,
  Settings,
  Edit,
  Save,
  X,
  BarChart3,
  Mic,
  User,
  Bot,
  Smile,
  Meh,
  Frown,
  Flame,
  Thermometer,
  Snowflake,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DashboardShell } from '@/components/dashboard-shell';
import { ModernStatsCard } from '@/components/modern-stats-card';
import { useActionPoints } from '@/hooks/use-action-points';
import { useDashboardAnalytics } from '@/hooks/use-dashboard-analytics';
import {
  useUserSettings,
  type AIReceptionistSettings,
} from '@/hooks/use-user-settings';
import { DashboardAnalytics } from '@/components/dashboard-analytics';
import { CallRecordingPlayer } from '@/components/call-recording-player';
import { CallTranscriptViewer } from '@/components/call-transcript-viewer';
import { ActionPoints, VapiCall } from '@/lib/types';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';
import { syncVapiAssistant } from '@/lib/actions/assistant.actions';

// Initialize content filter outside component to prevent recreation on every render
const contentFilter = new BadWordsFilter();
contentFilter.addWords('scam', 'fraud', 'fake', 'illegal', 'drugs');

// Helper function to get sentiment badge
const getSentimentBadge = (sentiment?: string) => {
  if (!sentiment) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }

  const config = {
    positive: {
      icon: Smile,
      variant: 'default' as const,
      className: 'bg-green-100 text-green-800 hover:bg-green-100',
    },
    neutral: {
      icon: Meh,
      variant: 'secondary' as const,
      className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
    },
    negative: {
      icon: Frown,
      variant: 'destructive' as const,
      className: 'bg-red-100 text-red-800 hover:bg-red-100',
    },
  };

  const {
    icon: Icon,
    variant,
    className,
  } = config[sentiment as keyof typeof config] || config.neutral;

  return (
    <Badge variant={variant} className={`text-xs ${className}`}>
      <Icon className="mr-1 h-3 w-3" />
      {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
    </Badge>
  );
};

// Helper function to get lead quality badge
const getLeadQualityBadge = (leadQuality?: string) => {
  if (!leadQuality) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }

  const config = {
    hot: {
      icon: Flame,
      variant: 'destructive' as const,
      className: 'bg-red-100 text-red-800 hover:bg-red-100',
    },
    warm: {
      icon: Thermometer,
      variant: 'default' as const,
      className: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
    },
    cold: {
      icon: Snowflake,
      variant: 'secondary' as const,
      className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
    },
  };

  const {
    icon: Icon,
    variant,
    className,
  } = config[leadQuality as keyof typeof config] || config.cold;

  return (
    <Badge variant={variant} className={`text-xs ${className}`}>
      <Icon className="mr-1 h-3 w-3" />
      {leadQuality.charAt(0).toUpperCase() + leadQuality.slice(1)}
    </Badge>
  );
};

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCall, setSelectedCall] = useState<VapiCall | null>(null);
  const [callDetailDialogOpen, setCallDetailDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');
  const [leadQualityFilter, setLeadQualityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');
  const [actionPoints, setActionPoints] = useState<ActionPoints | null>(null);
  const [timeRange, setTimeRange] = useState<number>(30);
  const [isBulkAnalyzing, setIsBulkAnalyzing] = useState(false);

  // AI Receptionist Settings State
  const [isEditing, setIsEditing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const {
    generateActionPoints,
    loading: actionPointsLoading,
    error: actionPointsError,
  } = useActionPoints();

  // Use the user settings hook for AI receptionist settings
  const {
    loading: settingsLoading,
    saving: settingsSaving,
    error: settingsError,
    dataLoaded,
    updateAIReceptionistSettings,
    getAIReceptionistSettings,
  } = useUserSettings();

  // Get current settings from the hook
  const savedData = getAIReceptionistSettings();

  // Current form data (can be different from saved while editing)
  const [formData, setFormData] = useState<AIReceptionistSettings>(savedData);

  // Update form data when settings are loaded
  useEffect(() => {
    if (dataLoaded) {
      const currentSettings = getAIReceptionistSettings();
      setFormData(currentSettings);
    }
  }, [dataLoaded, getAIReceptionistSettings]);

  // Fetch dashboard analytics data
  const { analytics, isLoading, error, refetch, isRefetching } =
    useDashboardAnalytics({
      days: timeRange,
      refetchInterval: 60000, // Refetch every minute
    });

  const calls: VapiCall[] = analytics?.recentCalls || [];

  // Calculate basic metrics from calls if analytics aren't loaded yet
  // Note: We no longer do client-side filtering here - the server-side analytics
  // handles this properly using VAPI's built-in success evaluation
  const totalCalls = analytics?.metrics?.totalCalls ?? 0;

  // Use the server-side analytics metrics when available, fallback for loading state
  const answeredCalls = analytics?.metrics?.answeredCalls ?? 0;
  const missedCalls = analytics?.metrics?.missedCalls ?? 0;
  const avgDuration = analytics?.metrics?.avgDuration ?? 0;

  // Filter and search logic
  const filteredCalls = calls
    .filter(call => {
      const matchesSearch =
        call.phoneNumber?.includes(searchQuery) ||
        call.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        call.endedReason.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' || call.endedReason === statusFilter;
      const matchesSentiment =
        sentimentFilter === 'all' || call.sentiment === sentimentFilter;
      const matchesLeadQuality =
        leadQualityFilter === 'all' || call.leadQuality === leadQualityFilter;
      return (
        matchesSearch && matchesStatus && matchesSentiment && matchesLeadQuality
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case 'duration':
          return b.durationSeconds - a.durationSeconds;
        case 'phone':
          return (a.phoneNumber || '').localeCompare(b.phoneNumber || '');
        case 'sentiment': {
          const sentimentOrder = { positive: 3, neutral: 2, negative: 1 };
          return (
            (sentimentOrder[b.sentiment as keyof typeof sentimentOrder] || 0) -
            (sentimentOrder[a.sentiment as keyof typeof sentimentOrder] || 0)
          );
        }
        case 'leadQuality': {
          const leadOrder = { hot: 3, warm: 2, cold: 1 };
          return (
            (leadOrder[b.leadQuality as keyof typeof leadOrder] || 0) -
            (leadOrder[a.leadQuality as keyof typeof leadOrder] || 0)
          );
        }
        default:
          return 0;
      }
    });

  // Debugging: Log the total calls from different sources in DashboardPage
  useEffect(() => {
    if (analytics) {
      logger.info('DASHBOARD_PAGE_METRICS', 'Analytics data loaded', {
        timeRange: timeRange,
        totalCallsFromAnalyticsMetrics: analytics.metrics?.totalCalls,
        totalCallsFromRecentCallsArray: calls.length,
        filteredCallsCount: filteredCalls.length,
      });
    }
  }, [analytics, calls.length, timeRange, filteredCalls.length]);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (endedReason: string) => {
    switch (endedReason.toLowerCase()) {
      case 'customer-ended-call':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        );
      case 'assistant-error':
      case 'error':
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Error
          </Badge>
        );
      case 'customer-did-not-give-microphone-permission':
      case 'no-answer':
        return (
          <Badge variant="secondary">
            <Phone className="mr-1 h-3 w-3" />
            No Answer
          </Badge>
        );
      case 'assistant-ended-call':
        return (
          <Badge variant="outline">
            <Phone className="mr-1 h-3 w-3" />
            Assistant Ended
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">{endedReason.replace(/-/g, ' ')}</Badge>
        );
    }
  };

  const openCallDetail = async (call: VapiCall) => {
    setSelectedCall(call);
    setCallDetailDialogOpen(true);
    setActionPoints(null); // Reset previous action points

    // Generate action points for this call
    if (call.transcript || call.summary) {
      const points = await generateActionPoints(call.id);
      if (points) {
        setActionPoints(points);
      }
    }
  };

  const handleBulkAnalyze = async () => {
    setIsBulkAnalyzing(true);
    try {
      const response = await fetch('/api/vapi/bulk-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          limit: 100, // Process 15 calls at a time to avoid overwhelming the system
        }),
      });

      if (response.ok) {
        const result = await response.json();

        // Show detailed feedback to user
        if (result.processed > 0) {
          toast({
            title: 'Analysis Complete!',
            description: `Successfully analyzed ${result.processed} calls. ${result.errors ? `${result.errors} errors occurred.` : 'No errors.'}`,
          });
        } else if (result.alreadyAnalyzed > 0) {
          toast({
            title: 'All calls already analyzed',
            description: `Found ${result.alreadyAnalyzed} previously analyzed calls. No new analysis needed.`,
          });
        } else {
          toast({
            title: 'No calls to analyze',
            description: 'No answered calls found for your assistant.',
            variant: 'destructive',
          });
        }

        // Refresh analytics to show updated sentiment data
        await refetch();

        logger.info('DASHBOARD', 'Bulk analysis completed', {
          processed: result.processed,
          errors: result.errors || 0,
          totalAvailable: result.totalAvailable,
          alreadyAnalyzed: result.alreadyAnalyzed,
        });
      } else {
        const errorData = await response.json();
        toast({
          title: 'Analysis Failed',
          description: errorData.error || response.statusText,
          variant: 'destructive',
        });
        console.error('Bulk analysis failed:', response.statusText, errorData);
      }
    } catch (error) {
      toast({
        title: 'Analysis Error',
        description: 'An unexpected error occurred during analysis.',
        variant: 'destructive',
      });
      console.error('Error during bulk analysis:', error);
    } finally {
      setIsBulkAnalyzing(false);
    }
  };

  // AI Receptionist Settings Functions
  const fieldLimits = {
    aiAssistantName: { maxLength: 25, minLength: 1 },
    yourName: { maxLength: 50, minLength: 1 },
    businessName: { maxLength: 100, minLength: 1 },
    greetingScript: { minLength: 10 },
  };

  const VALIDATION_PATTERNS = {
    NAME_PATTERN: /^[\p{L}](?:[\p{L}\s\-'.])*[\p{L}]$|^[\p{L}]$/u,
    BUSINESS_NAME_PATTERN:
      /^(?!.* {2})(?!.*--)(?!.*\.{2})(?!.*,{2})(?!.*'')(?!.*&&)(?!.*\(\()(?!.*\)\))[a-zA-Z0-9](?:[a-zA-Z0-9\s\-'.,&()]*[a-zA-Z0-9.)])?$/,
  };

  const validateContent = (field: string, value: string): string | null => {
    const limits = fieldLimits[field as keyof typeof fieldLimits];

    if (value.length < limits.minLength) {
      return `Minimum ${limits.minLength} characters required`;
    }
    if ('maxLength' in limits && value.length > limits.maxLength) {
      return `Maximum ${limits.maxLength} characters allowed`;
    }

    if (contentFilter.isProfane(value)) {
      return 'Please use professional, appropriate language';
    }

    switch (field) {
      case 'aiAssistantName':
      case 'yourName':
        if (!VALIDATION_PATTERNS.NAME_PATTERN.test(value)) {
          return 'Names should only contain letters, spaces, and basic punctuation';
        }
        break;
      case 'businessName':
        if (!VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test(value)) {
          return 'Business names should only contain letters, numbers, spaces, and basic punctuation';
        }
        break;
    }
    return null;
  };

  const handleEdit = () => {
    setIsEditing(true);
    setValidationErrors({});
  };

  const doSave = async () => {
    setConfirmOpen(false);
    const errors: Record<string, string> = {};
    Object.entries(formData).forEach(([field, value]) => {
      const error = validateContent(field, value);
      if (error) {
        errors[field] = error;
      }
    });
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      await updateAIReceptionistSettings(formData);
      setIsEditing(false);
      setValidationErrors({});

      logger.info('DASHBOARD', 'AI receptionist settings saved successfully', {
        settingsUpdated: Object.keys(formData),
      });

      toast({
        title: 'Settings saved',
        description:
          'Your AI receptionist settings have been updated successfully.',
      });
    } catch (error) {
      logger.error('DASHBOARD', 'Failed to save settings', error as Error, {
        formData: logger.sanitizeData(formData),
      });

      toast({
        title: 'Failed to save settings',
        description:
          'There was an error saving your settings. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    // Fire-and-forget Vapi sync
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await syncVapiAssistant(
          user.id,
          formData.aiAssistantName,
          formData.greetingScript
        );
      }
    } catch (syncErr) {
      logger.error(
        'DASHBOARD',
        'Failed to sync Vapi assistant',
        syncErr as Error
      );
    }
  };

  const handleCancel = () => {
    const currentSavedData = getAIReceptionistSettings();
    setFormData({ ...currentSavedData });
    setIsEditing(false);
    setValidationErrors({});
  };

  const handleInputChange = (field: string, value: string) => {
    const error = validateContent(field, value);
    setFormData(prev => ({ ...prev, [field]: value }));
    setValidationErrors(prev => ({ ...prev, [field]: error || '' }));
  };

  const currentSavedData = getAIReceptionistSettings();
  const isFormChanged =
    JSON.stringify(formData) !== JSON.stringify(currentSavedData);

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <DashboardShell>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-destructive">
                  <AlertTriangle className="mx-auto mb-4 h-12 w-12" />
                  <p>Error loading dashboard: {error.message}</p>
                  <Button onClick={() => refetch()} className="mt-4">
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          </DashboardShell>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <DashboardShell>
          {/* Header */}
          <div className="flex animate-fade-in items-center justify-between">
            <div>
              <h1 className="bg-gradient-primary bg-clip-text text-4xl font-bold text-transparent">
                Dashboard
              </h1>
              <p className="mt-2 text-lg text-muted-foreground">
                Monitor your AI receptionist and manage your settings
              </p>
            </div>
          </div>

          {/* Tabbed Interface */}
          <Tabs
            defaultValue="analytics"
            className="animate-slide-up space-y-6"
            style={{ animationDelay: '0.1s' }}
          >
            <TabsList className="grid w-full grid-cols-2 border border-white/10 bg-card/20 backdrop-blur-glass">
              <TabsTrigger
                value="analytics"
                className="flex items-center gap-2 transition-all duration-300 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
              >
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="flex items-center gap-2 transition-all duration-300 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
              >
                <Settings className="h-4 w-4" />
                AI Settings
              </TabsTrigger>
            </TabsList>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">
                  Monitor your AI receptionist performance and call analytics
                </p>
                <div className="flex items-center gap-4">
                  <Select
                    value={timeRange.toString()}
                    onValueChange={value => {
                      const newTimeRange = parseInt(value);
                      logger.info(
                        'DASHBOARD_TIME_FILTER',
                        'Time range filter changed',
                        {
                          oldTimeRange: timeRange,
                          newTimeRange: newTimeRange,
                        }
                      );
                      setTimeRange(newTimeRange);
                    }}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Time range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="90">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={isRefetching}
                  >
                    {isRefetching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkAnalyze}
                    disabled={isBulkAnalyzing}
                    title="Analyze recent calls to improve sentiment data accuracy"
                  >
                    {isBulkAnalyzing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Lightbulb className="h-4 w-4" />
                    )}
                    Analyze Calls
                  </Button>
                  <Badge variant="outline" className="text-sm">
                    <Phone className="mr-1 h-3 w-3" />
                    {totalCalls} Total Calls
                  </Badge>
                </div>
              </div>

              {/* Analytics Section */}
              {analytics && analytics.metrics && (
                <DashboardAnalytics
                  metrics={analytics.metrics}
                  trends={analytics.trends}
                />
              )}

              {/* Loading State */}
              {isLoading && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="py-8 text-center">
                      <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
                      <p className="text-muted-foreground">
                        Loading analytics...
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Filters and Search */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col gap-4 md:flex-row md:flex-wrap">
                    {/* Search */}
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                        <Input
                          placeholder="Search by phone number, summary, or status..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Status Filter */}
                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger className="w-48">
                        <FilterIcon className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="customer-ended-call">
                          Completed
                        </SelectItem>
                        <SelectItem value="assistant-error">Error</SelectItem>
                        <SelectItem value="customer-did-not-give-microphone-permission">
                          No Answer
                        </SelectItem>
                        <SelectItem value="assistant-ended-call">
                          Assistant Ended
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Sentiment Filter */}
                    <Select
                      value={sentimentFilter}
                      onValueChange={setSentimentFilter}
                    >
                      <SelectTrigger className="w-40">
                        <Smile className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Sentiment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sentiment</SelectItem>
                        <SelectItem value="positive">Positive</SelectItem>
                        <SelectItem value="neutral">Neutral</SelectItem>
                        <SelectItem value="negative">Negative</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Lead Quality Filter */}
                    <Select
                      value={leadQualityFilter}
                      onValueChange={setLeadQualityFilter}
                    >
                      <SelectTrigger className="w-40">
                        <Flame className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Lead Quality" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Leads</SelectItem>
                        <SelectItem value="hot">Hot</SelectItem>
                        <SelectItem value="warm">Warm</SelectItem>
                        <SelectItem value="cold">Cold</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Smart Sort Buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant={
                          sortBy === 'leadQuality' ? 'default' : 'outline'
                        }
                        size="sm"
                        onClick={() => setSortBy('leadQuality')}
                        className="flex items-center gap-2"
                      >
                        <Flame className="h-4 w-4" />
                        Hot First
                      </Button>
                      <Button
                        variant={sortBy === 'sentiment' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSortBy('sentiment')}
                        className="flex items-center gap-2"
                      >
                        <Smile className="h-4 w-4" />
                        Positive First
                      </Button>
                    </div>

                    {/* Sort By Dropdown */}
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Recent First</SelectItem>
                        <SelectItem value="duration">Duration</SelectItem>
                        <SelectItem value="phone">Phone Number</SelectItem>
                        <SelectItem value="sentiment">Sentiment</SelectItem>
                        <SelectItem value="leadQuality">
                          Lead Quality
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Call History Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Recent Calls ({filteredCalls.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="py-8 text-center">
                      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
                      <p className="mt-4 text-gray-600">Loading calls...</p>
                    </div>
                  ) : filteredCalls.length === 0 ? (
                    <div className="py-8 text-center">
                      <Phone className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {searchQuery ||
                        statusFilter !== 'all' ||
                        sentimentFilter !== 'all' ||
                        leadQualityFilter !== 'all'
                          ? 'No calls match your search criteria'
                          : 'No calls available yet'}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Phone Number</TableHead>
                            <TableHead>Date & Time</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Sentiment</TableHead>
                            <TableHead>Lead Quality</TableHead>
                            <TableHead>Cost</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredCalls.map(call => {
                            // Determine row highlighting based on lead quality - deep underglow effect for Hot and Warm only
                            let rowClassName =
                              'cursor-pointer transition-all duration-300 hover:bg-muted/50';

                            if (call.leadQuality === 'hot') {
                              rowClassName +=
                                ' bg-gradient-to-r from-red-500/10 via-red-600/5 to-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.2)] border-l-2 border-l-red-500/40';
                            } else if (call.leadQuality === 'warm') {
                              rowClassName +=
                                ' bg-gradient-to-r from-orange-500/10 via-orange-600/5 to-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.15)] border-l-2 border-l-orange-500/40';
                            }

                            // Determine phone number color based on lead quality - only for Hot and Warm
                            let phoneNumberColor = 'text-foreground';
                            if (call.leadQuality === 'hot') {
                              phoneNumberColor = 'text-red-700 font-semibold';
                            } else if (call.leadQuality === 'warm') {
                              phoneNumberColor = 'text-orange-700 font-medium';
                            }

                            return (
                              <TableRow
                                key={call.id}
                                className={rowClassName}
                                onClick={() => openCallDetail(call)}
                              >
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span className={phoneNumberColor}>
                                      {call.phoneNumber || 'Unknown'}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-foreground">
                                      {formatDate(
                                        call.createdAt || call.startedAt || ''
                                      )}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-mono text-foreground">
                                      {formatDuration(call.durationSeconds)}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {getStatusBadge(call.endedReason)}
                                </TableCell>
                                <TableCell>
                                  {getSentimentBadge(call.sentiment)}
                                </TableCell>
                                <TableCell>
                                  {getLeadQualityBadge(call.leadQuality)}
                                </TableCell>
                                <TableCell>
                                  <span className="text-foreground">
                                    {call.cost
                                      ? `$${call.cost.toFixed(3)}`
                                      : '-'}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openCallDetail(call)}
                                    className="text-xs"
                                  >
                                    <FileText className="mr-1 h-3 w-3" />
                                    View Details
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Call Detail Dialog */}
              <Dialog
                open={callDetailDialogOpen}
                onOpenChange={setCallDetailDialogOpen}
              >
                <DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Phone className="h-5 w-5" />
                      Call Details - {selectedCall?.phoneNumber || 'Unknown'}
                    </DialogTitle>
                    <DialogDescription>
                      {selectedCall && formatDate(selectedCall.createdAt)} •{' '}
                      {selectedCall &&
                        formatDuration(selectedCall.durationSeconds)}
                    </DialogDescription>
                  </DialogHeader>

                  {selectedCall && (
                    <div className="space-y-6">
                      {/* Call Info */}
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <Card>
                          <CardContent className="pt-4">
                            <div className="text-center">
                              <Clock className="mx-auto mb-2 h-8 w-8 text-blue-600" />
                              <p className="text-2xl font-bold text-foreground">
                                {formatDuration(selectedCall.durationSeconds)}
                              </p>
                              <p className="text-sm text-foreground">
                                Duration
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4">
                            <div className="text-center">
                              {getStatusBadge(selectedCall.endedReason)}
                              <p className="mt-2 text-sm text-foreground">
                                Call Status
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4">
                            <div className="text-center">
                              <Phone className="mx-auto mb-2 h-8 w-8 text-green-600" />
                              <p className="text-lg font-bold text-foreground">
                                {selectedCall.phoneNumber || 'Unknown'}
                              </p>
                              <p className="text-sm text-foreground">
                                Phone Number
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4">
                            <div className="text-center">
                              <TrendingUp className="mx-auto mb-2 h-8 w-8 text-purple-600" />
                              <p className="text-2xl font-bold text-foreground">
                                {selectedCall.cost
                                  ? `$${selectedCall.cost.toFixed(3)}`
                                  : '-'}
                              </p>
                              <p className="text-sm text-foreground">Cost</p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Call Recording */}
                      <CallRecordingPlayer callId={selectedCall.id} />

                      {/* Summary */}
                      {selectedCall.summary && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg text-foreground">
                              Call Summary
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="leading-relaxed text-foreground">
                              {selectedCall.summary}
                            </p>
                          </CardContent>
                        </Card>
                      )}

                      {/* Action Points Section */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                            <Lightbulb className="h-5 w-5" />
                            AI-Generated Action Points
                            {actionPointsLoading && (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {actionPointsLoading && (
                            <div className="py-4 text-center">
                              <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
                              <p className="text-sm text-muted-foreground">
                                Analyzing call content...
                              </p>
                            </div>
                          )}

                          {actionPointsError && (
                            <div className="py-4 text-center">
                              <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-red-500" />
                              <p className="text-sm text-red-600">
                                Failed to generate action points:{' '}
                                {actionPointsError}
                              </p>
                            </div>
                          )}

                          {actionPoints && !actionPointsLoading && (
                            <div className="space-y-4">
                              {/* Call Purpose */}
                              {actionPoints.callPurpose && (
                                <div>
                                  <h4 className="mb-2 font-semibold text-foreground">
                                    Call Purpose
                                  </h4>
                                  <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                                    {actionPoints.callPurpose}
                                  </p>
                                </div>
                              )}

                              {/* Sentiment */}
                              {actionPoints.sentiment && (
                                <div>
                                  <h4 className="mb-2 font-semibold text-foreground">
                                    Call Sentiment
                                  </h4>
                                  <Badge
                                    variant={
                                      actionPoints.sentiment === 'positive'
                                        ? 'default'
                                        : actionPoints.sentiment === 'negative'
                                          ? 'destructive'
                                          : 'secondary'
                                    }
                                    className="capitalize"
                                  >
                                    <Heart className="mr-1 h-3 w-3" />
                                    {actionPoints.sentiment}
                                  </Badge>
                                </div>
                              )}

                              {/* Key Points */}
                              {actionPoints.keyPoints &&
                                actionPoints.keyPoints.length > 0 && (
                                  <div>
                                    <h4 className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                                      <MessageSquare className="h-4 w-4" />
                                      Key Discussion Points (
                                      {actionPoints.keyPoints.length})
                                    </h4>
                                    <ul className="space-y-2">
                                      {actionPoints.keyPoints.map(
                                        (point, index) => (
                                          <li
                                            key={index}
                                            className="flex items-start gap-2"
                                          >
                                            <span className="mt-2 inline-block h-2 w-2 flex-shrink-0 rounded-full bg-blue-500"></span>
                                            <span className="text-sm text-foreground">
                                              {point}
                                            </span>
                                          </li>
                                        )
                                      )}
                                    </ul>
                                  </div>
                                )}

                              {/* Follow-up Items */}
                              {actionPoints.followUpItems &&
                                actionPoints.followUpItems.length > 0 && (
                                  <div>
                                    <h4 className="mb-2 flex items-center gap-2 font-semibold text-green-700">
                                      <ListTodo className="h-4 w-4" />
                                      Follow-up Actions (
                                      {actionPoints.followUpItems.length})
                                    </h4>
                                    <ul className="space-y-2">
                                      {actionPoints.followUpItems.map(
                                        (item, index) => (
                                          <li
                                            key={index}
                                            className="flex items-start gap-2"
                                          >
                                            <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                                            <span className="text-sm text-foreground">
                                              {item}
                                            </span>
                                          </li>
                                        )
                                      )}
                                    </ul>
                                  </div>
                                )}

                              {/* Urgent Concerns */}
                              {actionPoints.urgentConcerns &&
                                actionPoints.urgentConcerns.length > 0 && (
                                  <div>
                                    <h4 className="mb-2 flex items-center gap-2 font-semibold text-red-700">
                                      <AlertTriangle className="h-4 w-4" />
                                      Urgent Concerns (
                                      {actionPoints.urgentConcerns.length})
                                    </h4>
                                    <ul className="space-y-2">
                                      {actionPoints.urgentConcerns.map(
                                        (concern, index) => (
                                          <li
                                            key={index}
                                            className="flex items-start gap-2"
                                          >
                                            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                                            <span className="text-sm text-foreground">
                                              {concern}
                                            </span>
                                          </li>
                                        )
                                      )}
                                    </ul>
                                  </div>
                                )}

                              {/* Empty State */}
                              {(!actionPoints.keyPoints ||
                                actionPoints.keyPoints.length === 0) &&
                                (!actionPoints.followUpItems ||
                                  actionPoints.followUpItems.length === 0) &&
                                (!actionPoints.urgentConcerns ||
                                  actionPoints.urgentConcerns.length === 0) && (
                                  <div className="py-4 text-center">
                                    <MessageSquare className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">
                                      No specific action points identified from
                                      this call.
                                    </p>
                                  </div>
                                )}
                            </div>
                          )}

                          {!actionPoints &&
                            !actionPointsLoading &&
                            !actionPointsError && (
                              <div className="py-4 text-center">
                                <Lightbulb className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">
                                  {selectedCall.transcript ||
                                  selectedCall.summary
                                    ? 'Action points will be generated automatically...'
                                    : 'No transcript or summary available for analysis.'}
                                </p>
                              </div>
                            )}
                        </CardContent>
                      </Card>

                      {/* Transcript */}
                      {selectedCall.transcript && (
                        <CallTranscriptViewer
                          transcript={selectedCall.transcript}
                        />
                      )}
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* AI Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">
                  Configure your AI receptionist settings and greeting
                </p>
                {!isEditing && (
                  <Button
                    onClick={handleEdit}
                    className="flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit Settings
                  </Button>
                )}
              </div>

              {/* AI Receptionist Settings Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    AI Receptionist Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {settingsError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <p className="text-sm text-red-600">{settingsError}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Assistant Name */}
                    <div className="space-y-2">
                      <Label htmlFor="aiAssistantName">AI Assistant Name</Label>
                      <Input
                        id="aiAssistantName"
                        value={formData.aiAssistantName}
                        onChange={e =>
                          handleInputChange('aiAssistantName', e.target.value)
                        }
                        placeholder="e.g., Ava"
                        disabled={!isEditing || settingsSaving}
                        className={
                          validationErrors.aiAssistantName
                            ? 'border-red-500'
                            : ''
                        }
                      />
                      {validationErrors.aiAssistantName && (
                        <p className="text-sm text-red-500">
                          {validationErrors.aiAssistantName}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formData.aiAssistantName.length}/
                        {fieldLimits.aiAssistantName.maxLength} characters
                      </p>
                    </div>

                    {/* Your Name */}
                    <div className="space-y-2">
                      <Label htmlFor="yourName">Your Name</Label>
                      <Input
                        id="yourName"
                        value={formData.yourName}
                        onChange={e =>
                          handleInputChange('yourName', e.target.value)
                        }
                        placeholder="e.g., John Smith"
                        disabled={!isEditing || settingsSaving}
                        className={
                          validationErrors.yourName ? 'border-red-500' : ''
                        }
                      />
                      {validationErrors.yourName && (
                        <p className="text-sm text-red-500">
                          {validationErrors.yourName}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formData.yourName.length}/
                        {fieldLimits.yourName.maxLength} characters
                      </p>
                    </div>
                  </div>

                  {/* Business Name */}
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business Name</Label>
                    <Input
                      id="businessName"
                      value={formData.businessName}
                      onChange={e =>
                        handleInputChange('businessName', e.target.value)
                      }
                      placeholder="e.g., Smith Real Estate Group"
                      disabled={!isEditing || settingsSaving}
                      className={
                        validationErrors.businessName ? 'border-red-500' : ''
                      }
                    />
                    {validationErrors.businessName && (
                      <p className="text-sm text-red-500">
                        {validationErrors.businessName}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formData.businessName.length}/
                      {fieldLimits.businessName.maxLength} characters
                    </p>
                  </div>

                  {/* System Prompt */}
                  <div className="space-y-2">
                    <Label htmlFor="greetingScript">System Prompt</Label>
                    <Textarea
                      id="greetingScript"
                      value={formData.greetingScript}
                      onChange={e =>
                        handleInputChange('greetingScript', e.target.value)
                      }
                      placeholder="Hello! Thank you for calling [Business Name]. This is [Assistant Name], how can I help you today?"
                      disabled={!isEditing || settingsSaving}
                      className={`min-h-[120px] ${validationErrors.greetingScript ? 'border-red-500' : ''}`}
                    />
                    {validationErrors.greetingScript && (
                      <p className="text-sm text-red-500">
                        {validationErrors.greetingScript}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {isEditing && (
                    <div className="flex items-center gap-3 border-t pt-4">
                      <AlertDialog
                        open={confirmOpen}
                        onOpenChange={setConfirmOpen}
                      >
                        <AlertDialogTrigger asChild>
                          <Button
                            disabled={
                              settingsSaving ||
                              !isFormChanged ||
                              Object.values(validationErrors).some(Boolean)
                            }
                            className="flex items-center gap-2"
                          >
                            {settingsSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            {settingsSaving ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Changes</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to save these changes to
                              your AI receptionist settings? This will update
                              how your assistant introduces itself and responds
                              to callers.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={doSave}>
                              Save Changes
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <Button
                        variant="outline"
                        onClick={handleCancel}
                        disabled={settingsSaving}
                        className="flex items-center gap-2"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DashboardShell>
      </div>
    </ProtectedRoute>
  );
}
