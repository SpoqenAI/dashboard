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
  formatDateDetailed,
  calculateAndFormatCallDuration,
  getSentimentBadge as GetSentimentBadge,
  getLeadQualityBadge as GetLeadQualityBadge,
  getStatusBadge,
} from './dashboard-helpers';
import { VapiCall } from '@/lib/types';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Phone,
  Clock,
  DollarSign,
  RotateCcw,
} from 'lucide-react';
import {
  TextFilter,
  RangeFilter,
  SelectFilter,
  DateRangeFilter,
  DurationQuickFilter,
  CostSliderFilter,
} from '@/components/ui/column-filter';

// Enhanced interfaces for column filtering and sorting
interface ColumnFilters {
  phoneNumber: string;
  dateRange: {
    startDate: Date | null;
    endDate: Date | null;
  };
  duration: {
    min: number | null;
    max: number | null;
  };
  status: string;
  sentiment: string;
  leadQuality: string;
  cost: {
    min: number | null;
    max: number | null;
  };
}

interface SortState {
  column: keyof VapiCall | 'duration' | null;
  direction: 'asc' | 'desc';
}

interface CallHistoryTableProps {
  calls: VapiCall[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  // Column filters
  phoneNumberFilter: string;
  onPhoneNumberFilterChange: (value: string) => void;
  dateRange: ColumnFilters['dateRange'];
  onDateRangeChange: (startDate: Date | null, endDate: Date | null) => void;
  durationRange: ColumnFilters['duration'];
  onDurationRangeChange: (min: number | null, max: number | null) => void;
  costRange: ColumnFilters['cost'];
  onCostRangeChange: (min: number | null, max: number | null) => void;
  sentimentFilter: string;
  onSentimentFilterChange: (value: string) => void;
  leadQualityFilter: string;
  onLeadQualityFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  // Sorting
  sort: SortState;
  onSortChange: (
    column: keyof VapiCall | 'duration' | null,
    direction: 'asc' | 'desc'
  ) => void;
  // Clear filters
  onClearAllFilters: () => void;
  // Pagination
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  selectedCallId: string | null;
  onCallSelect: (call: VapiCall) => void;
}

const ITEMS_PER_PAGE = 20;

export const CallHistoryTable = memo(
  ({
    calls,
    isLoading,
    error,
    onRetry,
    // Column filters
    phoneNumberFilter,
    onPhoneNumberFilterChange,
    dateRange,
    onDateRangeChange,
    durationRange,
    onDurationRangeChange,
    costRange,
    onCostRangeChange,
    sentimentFilter,
    onSentimentFilterChange,
    leadQualityFilter,
    onLeadQualityFilterChange,
    statusFilter,
    onStatusFilterChange,
    // Sorting
    sort,
    onSortChange,
    // Clear filters
    onClearAllFilters,
    // Pagination
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

    // Helper function to toggle sort direction
    const handleColumnSort = (column: keyof VapiCall | 'duration') => {
      const newDirection =
        sort.column === column && sort.direction === 'asc' ? 'desc' : 'asc';
      onSortChange(column, newDirection);
    };

    // Helper function to get sort icon
    const getSortIcon = (column: keyof VapiCall | 'duration') => {
      if (sort.column !== column) return null;
      return sort.direction === 'asc' ? (
        <ChevronUp className="ml-1 h-3 w-3" />
      ) : (
        <ChevronDown className="ml-1 h-3 w-3" />
      );
    };

    // Check if any filters are active
    const hasActiveFilters = useMemo(() => {
      return (
        phoneNumberFilter !== '' ||
        dateRange.startDate !== null ||
        dateRange.endDate !== null ||
        durationRange.min !== null ||
        durationRange.max !== null ||
        costRange.min !== null ||
        costRange.max !== null ||
        sentimentFilter !== 'all' ||
        leadQualityFilter !== 'all' ||
        statusFilter !== 'all'
      );
    }, [
      phoneNumberFilter,
      dateRange,
      durationRange,
      costRange,
      sentimentFilter,
      leadQualityFilter,
      statusFilter,
    ]);

    // Helper to check if individual filters are active
    const isPhoneFilterActive = phoneNumberFilter !== '';
    const isDateRangeActive =
      dateRange.startDate !== null || dateRange.endDate !== null;
    const isDurationRangeActive =
      durationRange.min !== null || durationRange.max !== null;
    const isCostRangeActive = costRange.min !== null || costRange.max !== null;
    const isSentimentFilterActive = sentimentFilter !== 'all';
    const isLeadQualityFilterActive = leadQualityFilter !== 'all';
    const isStatusFilterActive = statusFilter !== 'all';

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
              <p className="mb-4 text-destructive">
                We couldn't load your calls. This might be due to a network
                issue.
              </p>
              <Button variant="outline" onClick={onRetry}>
                Try again
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Recent Calls
            </CardTitle>

            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearAllFilters}
                className="h-8 px-3 text-xs"
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                Clear All Filters
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            loadingSkeleton
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2">
                      <TableHead className="w-48 py-2">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleColumnSort('phoneNumber')}
                            className="h-auto p-0 font-medium hover:bg-transparent"
                          >
                            Phone Number
                            {getSortIcon('phoneNumber')}
                          </Button>
                          <TextFilter
                            value={phoneNumberFilter}
                            onChange={onPhoneNumberFilterChange}
                            placeholder="Filter phone..."
                            isActive={isPhoneFilterActive}
                            onClear={() => onPhoneNumberFilterChange('')}
                          />
                        </div>
                      </TableHead>
                      <TableHead className="w-40 py-2">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleColumnSort('startedAt')}
                            className="h-auto p-0 font-medium hover:bg-transparent"
                          >
                            Date/Time
                            {getSortIcon('startedAt')}
                          </Button>
                          <DateRangeFilter
                            startDate={dateRange.startDate}
                            endDate={dateRange.endDate}
                            onChange={onDateRangeChange}
                            isActive={isDateRangeActive}
                            onClear={() => onDateRangeChange(null, null)}
                          />
                        </div>
                      </TableHead>
                      <TableHead className="w-32 py-2">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleColumnSort('duration')}
                            className="h-auto p-0 font-medium hover:bg-transparent"
                          >
                            Duration
                            {getSortIcon('duration')}
                          </Button>
                          <DurationQuickFilter
                            min={durationRange.min}
                            onChange={onDurationRangeChange}
                            isActive={isDurationRangeActive}
                            onClear={() => onDurationRangeChange(null, null)}
                          />
                        </div>
                      </TableHead>
                      <TableHead className="w-32 py-2">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleColumnSort('endedReason')}
                            className="h-auto p-0 font-medium hover:bg-transparent"
                          >
                            Status
                            {getSortIcon('endedReason')}
                          </Button>
                          <SelectFilter
                            value={statusFilter}
                            onChange={onStatusFilterChange}
                            options={[
                              { value: 'all', label: 'All Status' },
                              {
                                value: 'customer-ended-call',
                                label: 'Completed',
                              },
                              { value: 'assistant-error', label: 'Error' },
                              { value: 'no-answer', label: 'No Answer' },
                              {
                                value: 'assistant-ended-call',
                                label: 'Assistant Ended',
                              },
                            ]}
                            isActive={isStatusFilterActive}
                            onClear={() => onStatusFilterChange('all')}
                            visualType="status"
                          />
                        </div>
                      </TableHead>
                      <TableHead className="w-32 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Sentiment</span>
                          <SelectFilter
                            value={sentimentFilter}
                            onChange={onSentimentFilterChange}
                            options={[
                              { value: 'all', label: 'All Sentiment' },
                              { value: 'positive', label: 'Positive' },
                              { value: 'neutral', label: 'Neutral' },
                              { value: 'negative', label: 'Negative' },
                            ]}
                            isActive={isSentimentFilterActive}
                            onClear={() => onSentimentFilterChange('all')}
                            visualType="sentiment"
                          />
                        </div>
                      </TableHead>
                      <TableHead className="w-32 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Lead Quality</span>
                          <SelectFilter
                            value={leadQualityFilter}
                            onChange={onLeadQualityFilterChange}
                            options={[
                              { value: 'all', label: 'All Quality' },
                              { value: 'hot', label: 'Hot' },
                              { value: 'warm', label: 'Warm' },
                              { value: 'cold', label: 'Cold' },
                            ]}
                            isActive={isLeadQualityFilterActive}
                            onClear={() => onLeadQualityFilterChange('all')}
                            visualType="leadQuality"
                          />
                        </div>
                      </TableHead>
                      <TableHead className="w-24 py-2">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleColumnSort('cost')}
                            className="h-auto p-0 font-medium hover:bg-transparent"
                          >
                            Cost
                            {getSortIcon('cost')}
                          </Button>
                          <CostSliderFilter
                            min={costRange.min}
                            onChange={onCostRangeChange}
                            isActive={isCostRangeActive}
                            onClear={() => onCostRangeChange(null, null)}
                            minValue={0}
                            maxValue={1}
                            step={0.01}
                          />
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calls.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <div className="py-8 text-center">
                            <Phone className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                            <h3 className="mb-2 text-lg font-semibold">
                              No calls found
                            </h3>
                            <p className="text-muted-foreground">
                              {hasActiveFilters
                                ? 'Try adjusting your filters or search terms.'
                                : 'Your calls will appear here once you start receiving them.'}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      calls.map(call => (
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
                          <TableCell>
                            {call.startedAt
                              ? formatDateDetailed(call.startedAt)
                              : 'Unknown'}
                          </TableCell>
                          <TableCell>
                            {call.startedAt
                              ? calculateAndFormatCallDuration(
                                  call.startedAt,
                                  call.endedAt
                                )
                              : 'Unknown'}
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
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="space-y-4 md:hidden">
                {calls.length === 0 ? (
                  <div className="py-8 text-center">
                    <Phone className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="mb-2 text-lg font-semibold">
                      No calls found
                    </h3>
                    <p className="text-muted-foreground">
                      {hasActiveFilters
                        ? 'Try adjusting your filters or search terms.'
                        : 'Your calls will appear here once you start receiving them.'}
                    </p>
                  </div>
                ) : (
                  calls.map(call => (
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
                                {call.startedAt
                                  ? formatDateDetailed(call.startedAt)
                                  : 'Unknown'}
                              </p>
                            </div>
                            {getStatusBadge(call.endedReason)}
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {call.startedAt
                                  ? calculateAndFormatCallDuration(
                                      call.startedAt,
                                      call.endedAt
                                    )
                                  : 'Unknown'}
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
                  ))
                )}
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
