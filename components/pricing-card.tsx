'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CheckCircle, Star, Zap } from 'lucide-react';
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

interface PricingTier {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  popular?: boolean;
  badge?: string;
  ctaText?: string;
  ctaVariant?: 'default' | 'neon' | 'outline';
}

const pricingTiers: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for testing the waters',
    monthlyPrice: 30,
    annualPrice: 24, // 20% discount
    features: [
      'Up to 100 calls per month',
      'Basic call summaries',
      'Email notifications',
      'Standard support',
    ],
    ctaText: 'Start Free Trial',
    ctaVariant: 'outline',
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'For growing businesses',
    monthlyPrice: 49,
    annualPrice: 39, // 20% discount
    features: [
      'Unlimited calls & minutes',
      'Advanced lead qualification',
      'CRM integrations (Webhook API)',
      'Real-time notifications',
      'Custom call scripts',
      'Priority support',
    ],
    popular: true,
    badge: 'Most Popular',
    ctaText: 'Start Free Trial',
    ctaVariant: 'neon',
  },
  {
    id: 'business',
    name: 'Business',
    description: 'For scaling enterprises',
    monthlyPrice: 99,
    annualPrice: 79, // 20% discount
    features: [
      'Everything in Professional',
      'Multi-language support',
      'Advanced analytics dashboard',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee',
    ],
    badge: 'High Performance',
    ctaText: 'Contact Sales',
    ctaVariant: 'outline',
  },
];

export function PricingCard() {
  const [isAnnual, setIsAnnual] = useState(true); // Default to annual for savings

  return (
    <div className="mx-auto w-full max-w-7xl">
      {/* Billing Toggle */}
      <div className="mb-8 flex items-center justify-center">
        <div className="flex items-center space-x-3 rounded-full border border-white/10 bg-card/20 p-1 backdrop-blur-glass">
          <button
            onClick={() => setIsAnnual(false)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium transition-all',
              !isAnnual
                ? 'bg-white text-black shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            className={cn(
              'relative rounded-full px-4 py-2 text-sm font-medium transition-all',
              isAnnual
                ? 'bg-white text-black shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Annual
            <Badge
              variant="secondary"
              className="absolute -right-2 -top-2 bg-green-500 px-1.5 py-0.5 text-xs text-white"
            >
              20% OFF
            </Badge>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-6 md:grid-cols-3 lg:gap-8">
        {pricingTiers.map(tier => {
          const price = isAnnual ? tier.annualPrice : tier.monthlyPrice;
          const yearlyTotal = tier.annualPrice * 12;
          const monthlyTotal = tier.monthlyPrice * 12;
          const savings = monthlyTotal - yearlyTotal;

          return (
            <Card
              key={tier.id}
              className={cn(
                'relative text-center transition-all duration-300 hover:scale-105',
                tier.popular
                  ? 'shadow-glow-primary/20 scale-105 border-primary/50 bg-card/30'
                  : 'border-white/10 bg-card/20'
              )}
            >
              {tier.badge && (
                <Badge
                  className={cn(
                    'absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1',
                    tier.popular
                      ? 'bg-primary text-white'
                      : 'bg-secondary text-secondary-foreground'
                  )}
                >
                  {tier.popular && <Star className="mr-1 h-3 w-3" />}
                  {tier.badge}
                </Badge>
              )}

              <CardHeader className="pb-4">
                <CardTitle className="text-xl">{tier.name}</CardTitle>
                <CardDescription className="text-sm">
                  {tier.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-baseline justify-center space-x-1">
                    <span className="text-4xl font-bold">${price}</span>
                    <span className="text-sm text-muted-foreground">
                      /month
                    </span>
                  </div>
                  {isAnnual && (
                    <div className="text-xs text-green-400">
                      Save ${savings}/year
                    </div>
                  )}
                  {!isAnnual && tier.annualPrice && (
                    <div className="text-xs text-muted-foreground">
                      ${tier.annualPrice}/month billed annually
                    </div>
                  )}
                </div>

                <ul className="space-y-3 text-left">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span className="text-sm text-muted-foreground">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="flex flex-col space-y-3">
                <Button
                  variant={tier.ctaVariant || 'default'}
                  className={cn(
                    'w-full',
                    tier.popular && 'shadow-glow-primary/30'
                  )}
                  asChild
                >
                  <Link
                    href={
                      tier.ctaText === 'Contact Sales' ? '/contact' : '/signup'
                    }
                  >
                    {tier.ctaText || 'Get Started'}
                    {tier.popular && <Zap className="ml-2 h-4 w-4" />}
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Risk Reversal & Trust */}
      <div className="mt-8 space-y-3 text-center">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            No credit card required
          </span>{' '}
          •<span className="mx-1">14-day free trial</span> •
          <span className="mx-1">Cancel anytime</span>
        </p>
        <p className="text-xs text-muted-foreground">
          ✓ Setup in 5 minutes • ✓ Money-back guarantee • ✓ No setup fees
        </p>
      </div>
    </div>
  );
}
