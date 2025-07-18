'use client';

import { useState } from 'react';
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
import { createCheckoutSession } from '@/lib/actions/paddle.actions';
import { useAuth } from '@/hooks/use-auth';
import { useSubscription } from '@/hooks/use-subscription';
import { isActiveSubscription } from '@/lib/paddle';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { useBillingPeriod } from './billing-toggle';
import type { PricingTier } from '../page';

interface PricingGridProps {
  pricingTiers: PricingTier[];
}

export function PricingGrid({ pricingTiers }: PricingGridProps) {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const { isAnnual } = useBillingPeriod();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<Record<string, number>>({});
  const [isPageLoading, setIsPageLoading] = useState(false);

  const hasActiveSubscription =
    subscription && isActiveSubscription(subscription);

  const handleSubscribe = async (tier: PricingTier) => {
    if (!user) {
      // Redirect to signup if not authenticated
      window.location.href = '/signup';
      return;
    }

    if (tier.id === 'free') {
      // Redirect to dashboard for free tier
      window.location.href = '/dashboard';
      return;
    }

    if (tier.id === 'business') {
      // Redirect to contact page for business tier
      window.location.href = '/contact';
      return;
    }

    const selectedPriceId = isAnnual ? tier.priceIdAnnual : tier.priceIdMonthly;

    if (!selectedPriceId) {
      toast({
        title: 'Configuration Error',
        description:
          'Price ID not configured for this plan. Please contact support.',
        variant: 'destructive',
      });
      return;
    }

    setLoadingTier(tier.id);
    setIsPageLoading(true);

    try {
      logger.info('PRICING_PAGE', 'Starting checkout process', {
        userId: logger.maskUserId(user.id),
        tierId: tier.id,
        priceId: selectedPriceId,
      });

      // Create URL with plan information as parameters
      const checkoutUrl = new URL(`/checkout/${selectedPriceId}`, window.location.origin);
      checkoutUrl.searchParams.set('plan', tier.name);
      checkoutUrl.searchParams.set('price', (isAnnual ? tier.annualPrice : tier.monthlyPrice).toString());
      checkoutUrl.searchParams.set('cycle', isAnnual ? 'Annual' : 'Monthly');
      
      // Redirect to our inline checkout page with plan info
      window.location.href = checkoutUrl.toString();
    } catch (error) {
      const currentRetries = retryCount[tier.id] || 0;

      logger.error(
        'PRICING_PAGE',
        'Checkout failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          userId: logger.maskUserId(user.id),
          tierId: tier.id,
          priceId: selectedPriceId,
          retryAttempt: currentRetries,
        }
      );

      if (currentRetries < 2) {
        setRetryCount(prev => ({ ...prev, [tier.id]: currentRetries + 1 }));
        toast({
          title: 'Checkout Failed',
          description: 'Unable to start checkout. Would you like to retry?',
          variant: 'destructive',
          action: (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSubscribe(tier)}
              className="ml-2"
            >
              Retry ({2 - currentRetries} attempts left)
            </Button>
          ),
        });
      } else {
        toast({
          title: 'Checkout Failed',
          description:
            'Unable to start checkout after multiple attempts. Please try again later or contact support.',
          variant: 'destructive',
        });
        // Reset retry count after max attempts
        setRetryCount(prev => ({ ...prev, [tier.id]: 0 }));
      }
    } finally {
      setLoadingTier(null);
      setIsPageLoading(false);
    }
  };

  const getCurrentTierStatus = (tier: PricingTier) => {
    if (!hasActiveSubscription) {
      return tier.id === 'free' ? 'current' : 'available';
    }

    // Check if current subscription matches this tier
    if (subscription?.price_id === tier.priceIdMonthly) {
      return 'current';
    }

    return 'available';
  };

  return (
    <div className="relative">
      {/* Page-level loading overlay */}
      {isPageLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            <p className="text-sm text-muted-foreground">
              Redirecting to checkout...
            </p>
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-3 lg:gap-6">
        {pricingTiers.map(tier => {
          const price = isAnnual ? tier.annualPrice : tier.monthlyPrice;
          const yearlyTotal = tier.annualPrice; // Annual price is the actual yearly total
          const monthlyTotal = tier.monthlyPrice * 12; // Monthly * 12 = yearly equivalent
          const savings = monthlyTotal - yearlyTotal;
          const tierStatus = getCurrentTierStatus(tier);
          const isLoading = loadingTier === tier.id;

          return (
            <Card
              key={tier.id}
              className={cn(
                'relative text-center transition-all duration-300 hover:scale-[1.02]',
                tier.popular
                  ? 'scale-105 border-primary/50 bg-card/80 shadow-lg'
                  : 'border-border bg-card/50',
                tierStatus === 'current' && 'ring-2 ring-primary/20'
              )}
            >
              {tier.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary px-3 py-1 text-primary-foreground">
                  <Star className="mr-1 h-3 w-3" />
                  Most Popular
                </Badge>
              )}

              {tierStatus === 'current' && (
                <Badge
                  variant="outline"
                  className="absolute -top-3 right-4 border-primary bg-background text-primary"
                >
                  Current Plan
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
                  onClick={() => handleSubscribe(tier)}
                  disabled={isLoading || tierStatus === 'current'}
                  variant={tier.popular ? 'default' : 'outline'}
                  className={cn('w-full', tier.popular && 'shadow-lg')}
                >
                  {isLoading ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
                      Processing...
                    </>
                  ) : tierStatus === 'current' ? (
                    'Current Plan'
                  ) : (
                    <>
                      {tier.ctaText}
                      {tier.popular && <Zap className="ml-2 h-4 w-4" />}
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
