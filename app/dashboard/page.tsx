'use client';

import { useState } from 'react';
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
  Filter,
  TrendingUp,
  Users,
  PhoneCall,
  Timer,
  Lightbulb,
  ListTodo,
  Heart,
  Loader2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DashboardHeader } from '@/components/dashboard-header';
import { useActionPoints } from '@/hooks/use-action-points';
import { ActionPoints } from '@/lib/types';
import { RecentCall } from '@/hooks/use-recent-calls';

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCall, setSelectedCall] = useState<RecentCall | null>(null);
  const [callDetailDialogOpen, setCallDetailDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');
  const [actionPoints, setActionPoints] = useState<ActionPoints | null>(null);

  const {
    generateActionPoints,
    loading: actionPointsLoading,
    error: actionPointsError,
  } = useActionPoints();

  // Query to fetch recent calls
  const {
    data: callsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['recent-calls'],
    queryFn: async () => {
      const res = await fetch('/api/vapi/recent-calls');
      if (!res.ok) {
        throw new Error('Failed to fetch calls');
      }
      return res.json();
    },
  });

  const calls: RecentCall[] = callsData?.calls || [];

  // Calculate metrics from calls
  const totalCalls = calls.length;
  const answeredCalls = calls.filter(
    call =>
      call.durationSeconds > 0 &&
      ![
        'customer-did-not-give-microphone-permission',
        'assistant-error',
        'no-answer',
      ].includes(call.endedReason)
  ).length;
  const missedCalls = totalCalls - answeredCalls;
  const avgDuration =
    answeredCalls > 0
      ? calls
          .filter(call => call.durationSeconds > 0)
          .reduce((sum, call) => sum + call.durationSeconds, 0) / answeredCalls
      : 0;

  // Filter and search logic
  const filteredCalls = calls
    .filter(call => {
      const matchesSearch =
        call.phoneNumber?.includes(searchQuery) ||
        call.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        call.endedReason.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' || call.endedReason === statusFilter;
      return matchesSearch && matchesStatus;
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
        default:
          return 0;
      }
    });

  const formatDuration = (seconds: number): string => {
    // Handle negative input values
    if (seconds < 0) {
      return '0:00';
    }

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

  const openCallDetail = async (call: RecentCall) => {
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

  if (error) {
    return (
      <ProtectedRoute>
        <div className="p-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-red-600">
                <AlertTriangle className="mx-auto mb-4 h-12 w-12" />
                <p>Error loading dashboard: {error.message}</p>
                <Button onClick={() => refetch()} className="mt-4">
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-background via-purple-950/10 to-blue-950/10">
        <DashboardHeader />

        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="mt-2 text-foreground">
                Monitor your AI receptionist performance and call analytics
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                <Phone className="mr-1 h-3 w-3" />
                {totalCalls} Total Calls
              </Badge>
            </div>
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="rounded-lg bg-blue-100 p-2">
                    <PhoneCall className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-foreground">
                      Total Calls
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {totalCalls}
                    </p>
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
                    <p className="text-sm font-medium text-foreground">
                      Answered
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {answeredCalls}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="rounded-lg bg-red-100 p-2">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-foreground">
                      Missed
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {missedCalls}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="rounded-lg bg-purple-100 p-2">
                    <Timer className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-foreground">
                      Avg Duration
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatDuration(Math.round(avgDuration))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 md:flex-row">
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
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <Filter className="mr-2 h-4 w-4" />
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

                {/* Sort By */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Recent First</SelectItem>
                    <SelectItem value="duration">Duration</SelectItem>
                    <SelectItem value="phone">Phone Number</SelectItem>
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
                    {searchQuery || statusFilter !== 'all'
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
                        <TableHead>Cost</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCalls.map(call => (
                        <TableRow key={call.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span className="text-foreground">
                                {call.phoneNumber || 'Unknown'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-foreground">
                                {formatDate(call.createdAt)}
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
                            <span className="text-foreground">
                              {call.cost ? `$${call.cost.toFixed(3)}` : '-'}
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
                      ))}
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
                  {selectedCall && formatDuration(selectedCall.durationSeconds)}
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
                          <p className="text-sm text-foreground">Duration</p>
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
                                  No specific action points identified from this
                                  call.
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
                              {selectedCall.transcript || selectedCall.summary
                                ? 'Action points will be generated automatically...'
                                : 'No transcript or summary available for analysis.'}
                            </p>
                          </div>
                        )}
                    </CardContent>
                  </Card>

                  {/* Transcript */}
                  {selectedCall.transcript && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg text-foreground">
                          Call Transcript
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="max-h-60 overflow-y-auto rounded-lg bg-card p-4">
                          <pre className="whitespace-pre-wrap font-mono text-foreground">
                            {selectedCall.transcript}
                          </pre>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </ProtectedRoute>
  );
}
