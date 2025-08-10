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
import { Filter, X } from 'lucide-react';
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
      new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1))
    );
    const currentStart = toStartOfDay(new Date(startDate));
    // End date should be roughly today
    const endIsToday = !endDate || toStartOfDay(new Date(endDate)).getTime() === today.getTime();
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
