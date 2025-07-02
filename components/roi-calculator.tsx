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
    <Card className="bg-card/20 backdrop-blur-glass border border-white/10 hover:bg-card/30 transition-all duration-300 max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Calculator className="w-6 h-6 text-primary" />
          <CardTitle className="text-2xl font-bold">Calculate Your ROI</CardTitle>
        </div>
        <p className="text-muted-foreground">See how much revenue you're leaving on the table</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="missed-leads" className="text-sm font-medium">
              Monthly leads you miss:
            </Label>
            <Input
              id="missed-leads"
              type="number"
              value={missedLeads}
              onChange={(e) => setMissedLeads(Number(e.target.value))}
              className="bg-background/50 border-white/20"
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
              onChange={(e) => setDealValue(Number(e.target.value))}
              className="bg-background/50 border-white/20"
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
              onChange={(e) => setCloseRate(Number(e.target.value))}
              className="bg-background/50 border-white/20"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-white/10">
          <div className="text-center p-4 bg-destructive/20 backdrop-blur-glass border border-destructive/30 rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Monthly revenue lost:</div>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(monthlyLoss)}</div>
          </div>
          
          <div className="text-center p-4 bg-primary/20 backdrop-blur-glass border border-primary/30 rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">With Spoqen recovered:</div>
            <div className="text-2xl font-bold text-primary">{formatCurrency(spoqenRecovery)}</div>
          </div>
          
          <div className="text-center p-4 bg-accent/20 backdrop-blur-glass border border-accent/30 rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">ROI:</div>
            <div className="text-2xl font-bold text-accent flex items-center justify-center gap-1">
              <TrendingUp className="w-5 h-5" />
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