'use client';

import { useState, createContext, useContext, ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Context to share billing period state with pricing grid
const BillingContext = createContext<{
  isAnnual: boolean;
  setIsAnnual: (value: boolean) => void;
}>({
  isAnnual: true,
  setIsAnnual: () => {},
});

export const useBillingPeriod = () => useContext(BillingContext);

interface BillingProviderProps {
  children: ReactNode;
}

export function BillingProvider({ children }: BillingProviderProps) {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <BillingContext.Provider value={{ isAnnual, setIsAnnual }}>
      {children}
    </BillingContext.Provider>
  );
}

export function BillingToggle() {
  const { isAnnual, setIsAnnual } = useBillingPeriod();

  return (
    <div
      role="group"
      aria-label="Billing frequency selection"
      className="inline-flex items-center space-x-3 rounded-full border border-border bg-card/50 p-1 backdrop-blur-sm"
    >
      <button
        type="button"
        aria-pressed={!isAnnual}
        aria-label="Select monthly billing"
        onClick={() => setIsAnnual(false)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsAnnual(false);
          }
        }}
        className={cn(
          'rounded-full px-4 py-2 text-sm font-medium transition-all',
          !isAnnual
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Monthly
      </button>
      <button
        type="button"
        aria-pressed={isAnnual}
        aria-label="Select annual billing with 20% discount"
        onClick={() => setIsAnnual(true)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsAnnual(true);
          }
        }}
        className={cn(
          'relative rounded-full px-4 py-2 text-sm font-medium transition-all',
          isAnnual
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Annual
        <Badge
          aria-label="20% discount"
          variant="secondary"
          className="absolute -right-2 -top-2 bg-green-500 px-1.5 py-0.5 text-xs text-white"
        >
          20% OFF
        </Badge>
      </button>
    </div>
  );
}
