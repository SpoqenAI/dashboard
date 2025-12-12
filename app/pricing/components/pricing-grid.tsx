'use client';

import { Check, Star, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useBillingPeriod } from './billing-toggle';
import type { PricingTier } from '../page';

interface PricingGridProps {
  pricingTiers: PricingTier[];
}

export function PricingGrid({ pricingTiers }: PricingGridProps) {
  const { isAnnual } = useBillingPeriod();

  return (
    <div className="relative">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {pricingTiers.map(tier => {
          const price = isAnnual ? tier.annualPrice : tier.monthlyPrice;
          const yearlyTotal = tier.annualPrice; // Annual price is the actual yearly total
          const monthlyTotal = tier.monthlyPrice * 12; // Monthly * 12 = yearly equivalent
          const savings = monthlyTotal - yearlyTotal;

          return (
            <Card
              key={tier.id}
              className={cn(
                'relative text-center transition-all duration-300 hover:scale-[1.02]',
                tier.popular
                  ? 'scale-105 border-primary/50 bg-card/80 shadow-lg'
                  : 'border-border bg-card/50'
              )}
            >
              {tier.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary px-3 py-1 text-primary-foreground">
                  <Star className="mr-1 h-3 w-3" />
                  Most Popular
                </Badge>
              )}

              <CardHeader className="pb-6">
                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                <CardDescription className="text-base">
                  {tier.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Pricing */}
                <div className="space-y-2">
                  <div className="flex items-baseline justify-center space-x-1">
                    {tier.id === 'business' ? (
                      <span className="text-3xl font-bold">Contact Sales</span>
                    ) : price === 0 ? (
                      <span className="text-4xl font-bold">Free</span>
                    ) : (
                      <>
                        <span className="text-4xl font-bold">${price}</span>
                        <span className="text-sm text-muted-foreground">
                          /{isAnnual ? 'year' : 'month'}
                        </span>
                      </>
                    )}
                  </div>
                  {isAnnual && savings > 0 && (
                    <div className="text-sm font-medium text-green-600">
                      Save ${savings}/year
                    </div>
                  )}
                  {!isAnnual && tier.annualPrice > 0 && (
                    <div className="text-xs text-muted-foreground">
                      ${Math.round(tier.annualPrice / 12)}/month billed annually
                    </div>
                  )}
                </div>

                {/* Limits */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Calls:</span>
                    <span className="font-medium">{tier.limits.calls}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Minutes:</span>
                    <span className="font-medium">{tier.limits.minutes}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Support:</span>
                    <span className="font-medium">{tier.limits.support}</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 text-left">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span className="text-sm text-muted-foreground">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pt-6">
                <Button
                  asChild
                  variant={tier.popular ? 'default' : 'outline'}
                  className={cn('w-full', tier.popular && 'shadow-lg')}
                >
                  <a href="/contact">
                    {tier.ctaText}
                    {tier.popular && <Zap className="ml-2 h-4 w-4" />}
                  </a>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
