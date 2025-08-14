'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator, TrendingUp } from 'lucide-react';

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
    <Card className="mx-auto max-w-2xl border border-white/10 bg-card/10 transition-all duration-300 hover:bg-card/20">
      <CardHeader className="text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          <Calculator className="h-6 w-6 text-primary" />
          <CardTitle className="text-2xl font-bold">
            Calculate Your ROI
          </CardTitle>
        </div>
        <p className="text-muted-foreground">
          See how much revenue you're leaving on the table
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
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
              className="border-white/20 bg-background/50"
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
              className="border-white/20 bg-background/50"
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
              className="border-white/20 bg-background/50"
            />
          </div>
        </div>

        <div className="grid gap-4 border-t border-white/10 pt-4 md:grid-cols-3">
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-center">
            <div className="mb-1 text-sm text-muted-foreground">
              Monthly revenue lost:
            </div>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(monthlyLoss)}
            </div>
          </div>

          <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 text-center">
            <div className="mb-1 text-sm text-muted-foreground">
              With Spoqen recovered:
            </div>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(spoqenRecovery)}
            </div>
          </div>

          <div className="rounded-lg border border-accent/30 bg-accent/10 p-4 text-center">
            <div className="mb-1 text-sm text-muted-foreground">ROI:</div>
            <div className="flex items-center justify-center gap-1 text-2xl font-bold text-accent">
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
