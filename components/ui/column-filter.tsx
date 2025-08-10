'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverClose,
} from '@/components/ui/popover';
import { Select } from '@/components/ui/select';
import { Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  getSentimentBadge as GetSentimentBadge,
  getLeadQualityBadge as GetLeadQualityBadge,
  getStatusBadge,
} from '@/components/dashboard/dashboard-helpers';

// Base filter component props
interface BaseFilterProps {
  isActive: boolean;
  onClear: () => void;
  children?: React.ReactNode;
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

// Quick-select filter for duration (seconds)
interface DurationQuickFilterProps extends BaseFilterProps {
  min: number | null;
  onChange: (min: number | null, max: number | null) => void;
}

// Slider filter for cost (minimum threshold)
interface CostSliderFilterProps extends BaseFilterProps {
  min: number | null;
  onChange: (min: number | null, max: number | null) => void;
  minValue?: number; // default 0
  maxValue?: number; // default 5
  step?: number; // default 0.01
}

// Select filter for status, sentiment, lead quality
interface SelectFilterProps extends BaseFilterProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  visualType?: 'sentiment' | 'leadQuality' | 'status';
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
        aria-pressed={isActive}
        className={cn(
          'h-6 px-2 text-xs',
          isActive && 'bg-blue-100 text-blue-700 hover:bg-blue-200'
        )}
      >
        <Filter className="h-3 w-3" />
      </Button>
    </PopoverTrigger>
    <PopoverContent
      className="max-h-[min(80vh,24rem)] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] overflow-auto p-3 sm:w-72"
      align="start"
      side="bottom"
      sideOffset={8}
      collisionPadding={8}
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

// Duration quick filter component
export const DurationQuickFilter: React.FC<DurationQuickFilterProps> = ({
  min,
  onChange,
  isActive,
  onClear,
}) => {
  const current = typeof min === 'number' ? Math.min(Math.max(min, 1), 120) : 1;

  return (
    <FilterWrapper isActive={isActive} onClear={onClear}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Minimum duration</Label>
          <span className="text-[11px] text-muted-foreground">{current}s</span>
        </div>
        <div className="px-1 py-1">
          <Slider
            min={1}
            max={120}
            step={1}
            value={[current]}
            onValueChange={val => {
              const next = Array.isArray(val) ? val[0] : current;
              onChange(next, null);
            }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>1s</span>
          <span>2m</span>
        </div>
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 flex-1 text-xs"
            onClick={() => onClear()}
          >
            Clear
          </Button>
        </div>
      </div>
    </FilterWrapper>
  );
};

// Cost slider filter component
export const CostSliderFilter: React.FC<CostSliderFilterProps> = ({
  min,
  onChange,
  isActive,
  onClear,
  minValue = 0,
  maxValue = 1,
  step = 0.01,
}) => {
  const current =
    typeof min === 'number'
      ? Math.min(Math.max(min, minValue), maxValue)
      : minValue;

  return (
    <FilterWrapper isActive={isActive} onClear={onClear}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Minimum cost</Label>
          <span className="text-[11px] text-muted-foreground">
            ${current.toFixed(2)}
          </span>
        </div>
        <div className="px-1 py-1">
          <Slider
            min={minValue}
            max={maxValue}
            step={step}
            value={[current]}
            onValueChange={val => {
              const next = Array.isArray(val) ? (val[0] as number) : current;
              onChange(Number(next.toFixed(4)), null);
            }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>${minValue.toFixed(2)}</span>
          <span>${maxValue.toFixed(2)}</span>
        </div>
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 flex-1 text-xs"
            onClick={() => onClear()}
          >
            Clear
          </Button>
        </div>
      </div>
    </FilterWrapper>
  );
};

// Select filter component
export const SelectFilter: React.FC<SelectFilterProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  isActive,
  onClear,
  visualType,
}) => (
  <FilterWrapper isActive={isActive} onClear={onClear}>
    <div className="space-y-2">
      <Label className="text-xs font-medium">Filter by value</Label>
      <div className="flex flex-col gap-1">
        {options.map(option => {
          let content: React.ReactNode = option.label;
          if (visualType === 'sentiment' && option.value !== 'all') {
            content = <GetSentimentBadge sentiment={option.value} />;
          } else if (visualType === 'leadQuality' && option.value !== 'all') {
            content = <GetLeadQualityBadge leadQuality={option.value} />;
          } else if (visualType === 'status' && option.value !== 'all') {
            content = getStatusBadge(option.value);
          } else if (option.value === 'all') {
            content = (
              <Badge variant="secondary" className="text-xs">
                {option.label}
              </Badge>
            );
          }
          return (
            <PopoverClose asChild key={option.value}>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8 w-full justify-start text-xs hover:bg-accent/20',
                  value === option.value && 'bg-accent/30'
                )}
                onClick={() => onChange(option.value)}
              >
                {content}
              </Button>
            </PopoverClose>
          );
        })}
      </div>
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
  const quickOptions = [
    { key: 'all', label: 'All time', days: 0 },
    { key: '7', label: 'Last 7 days', days: 7 },
    { key: '14', label: 'Last 14 days', days: 14 },
    { key: '30', label: 'Last 30 days', days: 30 },
    { key: '60', label: 'Last 60 days', days: 60 },
    { key: '90', label: 'Last 90 days', days: 90 },
  ];

  const toStartOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  const isOptionSelected = (days: number) => {
    if (days === 0) return !startDate && !endDate;
    if (!startDate) return false;
    const today = toStartOfDay(new Date());
    const expectedStart = toStartOfDay(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - (days - 1)
      )
    );
    const currentStart = toStartOfDay(new Date(startDate));
    // End date should be roughly today
    const endIsToday =
      !endDate || toStartOfDay(new Date(endDate)).getTime() === today.getTime();
    return currentStart.getTime() === expectedStart.getTime() && endIsToday;
  };

  const applyDays = (days: number) => {
    if (days === 0) {
      onChange(null, null);
      return;
    }
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(today);
    start.setDate(today.getDate() - (days - 1));
    onChange(start, now);
  };

  return (
    <FilterWrapper isActive={isActive} onClear={onClear}>
      <div className="space-y-2">
        <Label className="text-xs font-medium">Filter by date range</Label>
        <div className="grid grid-cols-1 gap-1">
          {quickOptions.map(opt => (
            <Button
              key={opt.key}
              variant={isOptionSelected(opt.days) ? 'default' : 'ghost'}
              size="sm"
              className="h-7 justify-start text-xs"
              onClick={() => applyDays(opt.days)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>
    </FilterWrapper>
  );
};
