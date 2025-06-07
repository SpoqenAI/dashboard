'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2 } from 'lucide-react';
import { STRIPE_CONFIG, StripePlan } from '@/lib/stripe';
import { toast } from '@/components/ui/use-toast';

interface StripeCheckoutProps {
  currentPlan?: StripePlan | 'free';
}

export function StripeCheckout({ currentPlan }: StripeCheckoutProps) {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: STRIPE_CONFIG.plan.priceId,
          planType: 'professional',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        title: 'Error',
        description: 'Failed to start checkout process. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price / 100);
  };

  const plan = STRIPE_CONFIG.plan;
  const isCurrentPlan = currentPlan === 'professional';

  return (
    <div className="max-w-md mx-auto">
      <Card className={`relative ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}>
        {isCurrentPlan && (
          <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">
            Current Plan
          </Badge>
        )}
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {plan.name}
            <span className="text-2xl font-bold">
              {formatPrice(plan.price)}
              <span className="text-sm font-normal text-muted-foreground">
                /month
              </span>
            </span>
          </CardTitle>
          <CardDescription>
            Perfect for growing real estate professionals who want to maximize their productivity and never miss a lead.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
          <Button
            onClick={handleSubscribe}
            disabled={isCurrentPlan || loading}
            className="w-full"
            variant={isCurrentPlan ? 'secondary' : 'default'}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isCurrentPlan 
              ? 'Current Plan' 
              : `Subscribe to ${plan.name}`
            }
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 