import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  formatDate,
  formatDuration,
  getSentimentBadge as GetSentimentBadge,
  getLeadQualityBadge as GetLeadQualityBadge,
  getStatusBadge,
} from './dashboard-helpers';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Phone,
  Clock,
  DollarSign,
} from 'lucide-react';

// Define interfaces
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

interface CallHistoryTableProps {
  calls: CallData[];
  isLoading: boolean;
  error: string | null;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sentimentFilter: string;
  onSentimentFilterChange: (value: string) => void;
  leadQualityFilter: string;
  onLeadQualityFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  selectedCallId: string | null;
  onCallSelect: (call: CallData) => void;
}

const ITEMS_PER_PAGE = 20;

export const CallHistoryTable = memo(
  ({
    calls,
    isLoading,
    error,
    searchTerm,
    onSearchChange,
    sentimentFilter,
    onSentimentFilterChange,
    leadQualityFilter,
    onLeadQualityFilterChange,
    statusFilter,
    onStatusFilterChange,
    currentPage,
    totalPages,
    onPageChange,
    selectedCallId,
    onCallSelect,
  }: CallHistoryTableProps) => {
    // Compute pagination helper functions
    const handlePreviousPage = () => {
      if (currentPage > 1) {
        onPageChange(currentPage - 1);
      }
    };

    const handleNextPage = () => {
      if (currentPage < totalPages) {
        onPageChange(currentPage + 1);
      }
    };

    // Memoize loading skeleton
    const loadingSkeleton = useMemo(
      () => (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex space-x-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      ),
      []
    );

    if (error) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Recent Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-8 text-center">
              <p className="text-destructive">Error loading calls: {error}</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Recent Calls
          </CardTitle>

          {/* Filters */}
          <div className="mt-4 flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by phone number..."
                value={searchTerm}
                onChange={e => onSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex gap-2">
              <Select
                value={sentimentFilter}
                onValueChange={onSentimentFilterChange}
              >
                <SelectTrigger className="w-32">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Sentiment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sentiment</SelectItem>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={leadQualityFilter}
                onValueChange={onLeadQualityFilterChange}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Lead Quality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Quality</SelectItem>
                  <SelectItem value="hot">Hot</SelectItem>
                  <SelectItem value="warm">Warm</SelectItem>
                  <SelectItem value="cold">Cold</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={onStatusFilterChange}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="customer-ended-call">Completed</SelectItem>
                  <SelectItem value="assistant-error">Error</SelectItem>
                  <SelectItem value="no-answer">No Answer</SelectItem>
                  <SelectItem value="assistant-ended-call">
                    Assistant Ended
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            loadingSkeleton
          ) : calls.length === 0 ? (
            <div className="py-8 text-center">
              <Phone className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No calls found</h3>
              <p className="text-muted-foreground">
                {searchTerm ||
                sentimentFilter !== 'all' ||
                leadQualityFilter !== 'all' ||
                statusFilter !== 'all'
                  ? 'Try adjusting your filters or search terms.'
                  : 'Your calls will appear here once you start receiving them.'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Date/Time</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sentiment</TableHead>
                      <TableHead>Lead Quality</TableHead>
                      <TableHead>Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calls.map(call => (
                      <TableRow
                        key={call.id}
                        className={`cursor-pointer transition-colors ${
                          selectedCallId === call.id
                            ? 'bg-blue-50 hover:bg-blue-100'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => onCallSelect(call)}
                      >
                        <TableCell className="font-medium">
                          {call.phoneNumber?.number || 'Unknown'}
                        </TableCell>
                        <TableCell>{formatDate(call.startedAt)}</TableCell>
                        <TableCell>
                          {call.startedAt && call.endedAt
                            ? formatDuration(
                                Math.round(
                                  (new Date(call.endedAt).getTime() -
                                    new Date(call.startedAt).getTime()) /
                                    1000
                                )
                              )
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(call.endedReason)}
                        </TableCell>
                        <TableCell>
                          <GetSentimentBadge
                            sentiment={call.analysis?.sentiment}
                          />
                        </TableCell>
                        <TableCell>
                          <GetLeadQualityBadge
                            leadQuality={call.analysis?.leadQuality}
                          />
                        </TableCell>
                        <TableCell>
                          ${call.cost?.toFixed(4) || '0.0000'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="space-y-4 md:hidden">
                {calls.map(call => (
                  <Card
                    key={call.id}
                    className={`cursor-pointer transition-colors ${
                      selectedCallId === call.id
                        ? 'border-blue-200 bg-blue-50'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => onCallSelect(call)}
                  >
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">
                              {call.phoneNumber?.number || 'Unknown'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(call.startedAt)}
                            </p>
                          </div>
                          {getStatusBadge(call.endedReason)}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {call.startedAt && call.endedAt
                                ? formatDuration(
                                    Math.round(
                                      (new Date(call.endedAt).getTime() -
                                        new Date(call.startedAt).getTime()) /
                                        1000
                                    )
                                  )
                                : '-'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span>${call.cost?.toFixed(4) || '0.0000'}</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <GetSentimentBadge
                            sentiment={call.analysis?.sentiment}
                          />
                          <GetLeadQualityBadge
                            leadQuality={call.analysis?.leadQuality}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    );
  }
);

CallHistoryTable.displayName = 'CallHistoryTable';
