import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Base filter component props
interface BaseFilterProps {
  isActive: boolean;
  onClear: () => void;
  children: React.ReactNode;
}

// Text filter for phone numbers
interface TextFilterProps extends BaseFilterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// Range filter for duration and cost
interface RangeFilterProps extends BaseFilterProps {
  min: number | null;
  max: number | null;
  onChange: (min: number | null, max: number | null) => void;
  step?: number;
  unit?: string;
  minPlaceholder?: string;
  maxPlaceholder?: string;
}

// Select filter for status, sentiment, lead quality
interface SelectFilterProps extends BaseFilterProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

// Date range filter for date/time
interface DateRangeFilterProps extends BaseFilterProps {
  startDate: Date | null;
  endDate: Date | null;
  onChange: (startDate: Date | null, endDate: Date | null) => void;
}

// Base filter wrapper
const FilterWrapper: React.FC<BaseFilterProps> = ({
  isActive,
  onClear,
  children,
}) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-6 px-2 text-xs',
          isActive && 'bg-blue-100 text-blue-700 hover:bg-blue-200'
        )}
      >
        <Filter className="h-3 w-3" />
        {isActive && (
          <span
            role="button"
            aria-label="Clear filter"
            tabIndex={0}
            onClick={e => {
              e.stopPropagation();
              onClear();
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onClear();
              }
            }}
            className="ml-1 rounded-full p-0.5 hover:bg-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <X className="h-2 w-2" />
          </span>
        )}
      </Button>
    </PopoverTrigger>
    <PopoverContent
      className="w-64 p-3"
      align="start"
      side="bottom"
      sideOffset={8}
      avoidCollisions={false}
    >
      {children}
    </PopoverContent>
  </Popover>
);

// Text filter component
export const TextFilter: React.FC<TextFilterProps> = ({
  value,
  onChange,
  placeholder = 'Filter...',
  isActive,
  onClear,
}) => (
  <FilterWrapper isActive={isActive} onClear={onClear}>
    <div className="space-y-2">
      <Label className="text-xs font-medium">Filter by text</Label>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-8 text-xs"
      />
      {value && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClear}
          className="h-7 w-full text-xs"
        >
          Clear
        </Button>
      )}
    </div>
  </FilterWrapper>
);

// Range filter component
export const RangeFilter: React.FC<RangeFilterProps> = ({
  min,
  max,
  onChange,
  step = 1,
  unit = '',
  minPlaceholder = 'Min',
  maxPlaceholder = 'Max',
  isActive,
  onClear,
}) => (
  <FilterWrapper isActive={isActive} onClear={onClear}>
    <div className="space-y-2">
      <Label className="text-xs font-medium">
        Filter by range {unit && `(${unit})`}
      </Label>
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="number"
          placeholder={minPlaceholder}
          value={min ?? ''}
          onChange={e => {
            const val = e.target.value === '' ? null : Number(e.target.value);
            onChange(val, max);
          }}
          step={step}
          className="h-8 text-xs"
        />
        <Input
          type="number"
          placeholder={maxPlaceholder}
          value={max ?? ''}
          onChange={e => {
            const val = e.target.value === '' ? null : Number(e.target.value);
            onChange(min, val);
          }}
          step={step}
          className="h-8 text-xs"
        />
      </div>
      {(min !== null || max !== null) && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClear}
          className="h-7 w-full text-xs"
        >
          Clear
        </Button>
      )}
    </div>
  </FilterWrapper>
);

// Select filter component
export const SelectFilter: React.FC<SelectFilterProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  isActive,
  onClear,
}) => (
  <FilterWrapper isActive={isActive} onClear={onClear}>
    <div className="space-y-2">
      <Label className="text-xs font-medium">Filter by value</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value !== 'all' && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClear}
          className="h-7 w-full text-xs"
        >
          Clear
        </Button>
      )}
    </div>
  </FilterWrapper>
);

// Date range filter component
export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  onChange,
  isActive,
  onClear,
}) => {
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(
    startDate || undefined
  );
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(
    endDate || undefined
  );

  const applyDateRange = () => {
    onChange(tempStartDate || null, tempEndDate || null);
  };

  const clearDates = () => {
    setTempStartDate(undefined);
    setTempEndDate(undefined);
    onClear();
  };

  return (
    <FilterWrapper isActive={isActive} onClear={onClear}>
      <div className="space-y-3">
        <Label className="text-xs font-medium">Filter by date range</Label>

        <div className="space-y-2">
          <div>
            <Label className="text-xs text-muted-foreground">From</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'h-8 w-full justify-start text-left text-xs font-normal',
                    !tempStartDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {tempStartDate
                    ? format(tempStartDate, 'MMM dd, yyyy')
                    : 'Pick start date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0"
                align="start"
                side="bottom"
                sideOffset={8}
                avoidCollisions={false}
              >
                <Calendar
                  mode="single"
                  selected={tempStartDate}
                  onSelect={setTempStartDate}
                  disabled={date =>
                    date > new Date() || (tempEndDate && date > tempEndDate)
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">To</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'h-8 w-full justify-start text-left text-xs font-normal',
                    !tempEndDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {tempEndDate
                    ? format(tempEndDate, 'MMM dd, yyyy')
                    : 'Pick end date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0"
                align="start"
                side="bottom"
                sideOffset={8}
                avoidCollisions={false}
              >
                <Calendar
                  mode="single"
                  selected={tempEndDate}
                  onSelect={setTempEndDate}
                  disabled={date =>
                    date > new Date() || (tempStartDate && date < tempStartDate)
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={applyDateRange}
            className="h-7 flex-1 text-xs"
          >
            Apply
          </Button>
          {(tempStartDate || tempEndDate) && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearDates}
              className="h-7 flex-1 text-xs"
            >
              Clear
            </Button>
          )}
        </div>
      </div>
    </FilterWrapper>
  );
};
