'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Calculator,
  TrendingUp,
  AlertTriangle,
  PhoneOff,
  GitBranch,
} from 'lucide-react';

export function ROICalculator() {
  const [missedLeads, setMissedLeads] = useState(50);
  const [dealValue, setDealValue] = useState(2000);
  const [closeRate, setCloseRate] = useState(20);

  const [monthlyLoss, setMonthlyLoss] = useState(0);
  const [spoqenRecovery, setSpoqenRecovery] = useState(0);
  const [roiMultiple, setRoiMultiple] = useState(0);

  useEffect(() => {
    const potentialRevenue = missedLeads * dealValue * (closeRate / 100);
    const recoveredRevenue = potentialRevenue * 0.9; // Assume 90% capture rate with Spoqen
    const spoqenCost = 30; // Monthly cost
    const netRecovery = recoveredRevenue - spoqenCost;
    const roi = spoqenCost > 0 ? (netRecovery / spoqenCost) * 100 : 0;

    setMonthlyLoss(potentialRevenue);
    setSpoqenRecovery(netRecovery);
    setRoiMultiple(roi);
  }, [missedLeads, dealValue, closeRate]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className="roi-calculator hover:shadow-glow-primary/20 mx-auto max-w-4xl overflow-hidden border border-white/10 bg-card/10 transition-all duration-300 hover:scale-105 hover:bg-card/20">
      <CardHeader className="text-center">
        {/* Ribbon headline merges Hidden Cost with ROI */}
        <div className="relative z-10 mb-3 flex items-center justify-center gap-2">
          <Calculator className="h-6 w-6 text-primary" />
          <CardTitle className="text-2xl font-bold">
            The Hidden Cost of Missed Calls — and Your ROI
          </CardTitle>
        </div>
        <p className="relative z-10 text-muted-foreground">
          Tweak the inputs to see how much you can recover each month
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Inline stats from the old Hidden Cost banner */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex items-center justify-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-2 text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Hidden Cost
            </span>
          </div>
          <div className="flex items-center justify-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-2 text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300">
            <PhoneOff className="h-4 w-4" />
            <span className="text-sm">73% never call back</span>
          </div>
          <div className="flex items-center justify-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-2 text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300">
            <GitBranch className="h-4 w-4" />
            <span className="text-sm">42% go to competitors</span>
          </div>
        </div>

        {/* Inputs + results */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="missed-leads" className="text-sm font-medium">
              Monthly leads you miss:
            </Label>
            <Input
              id="missed-leads"
              type="number"
              value={missedLeads}
              onChange={e => setMissedLeads(Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deal-value" className="text-sm font-medium">
              Average deal value ($):
            </Label>
            <Input
              id="deal-value"
              type="number"
              value={dealValue}
              onChange={e => setDealValue(Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="close-rate" className="text-sm font-medium">
              Close rate (%):
            </Label>
            <Input
              id="close-rate"
              type="number"
              value={closeRate}
              onChange={e => setCloseRate(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="grid gap-4 border-t border-border pt-4 md:grid-cols-3">
          <div className="rounded-lg border border-destructive/30 bg-card p-4 text-center">
            <div className="mb-1 text-sm text-muted-foreground">
              Monthly revenue lost:
            </div>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(monthlyLoss)}
            </div>
          </div>

          <div className="rounded-lg border border-primary/30 bg-card p-4 text-center">
            <div className="mb-1 text-sm text-muted-foreground">
              With Spoqen recovered:
            </div>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(spoqenRecovery)}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-lg border border-accent/30 bg-card p-4 text-center">
            <div className="mb-1 text-sm text-muted-foreground">ROI:</div>
            <div className="relative z-10 flex items-center justify-center gap-1 text-2xl font-bold text-accent">
              <TrendingUp className="h-5 w-5" />
              {roiMultiple.toFixed(0)}%
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          *Assumes 90% lead capture rate with Spoqen AI receptionist
        </div>
      </CardContent>
    </Card>
  );
}
