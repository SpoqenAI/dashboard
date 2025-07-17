'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  Star,
  Zap,
  Shield,
  Headphones,
  Globe,
  BarChart3,
} from 'lucide-react';
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
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface PricingTier {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  popular?: boolean;
  ctaText: string;
  priceId: string;
  limits: {
    calls: string;
    minutes: string;
    support: string;
  };
}

const pricingTiers: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for setting up your AI assistant',
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      'AI assistant setup only',
      'Basic greeting customization',
      'Community support',
      'No call handling (setup only)',
    ],
    limits: {
      calls: 'Setup only',
      minutes: 'No calling',
      support: 'Community',
    },
    ctaText: 'Get Started Free',
    priceId: '', // Free tier doesn't need a price ID
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'For small businesses getting started',
    monthlyPrice: 10,
    annualPrice: 8,
    features: [
      'Up to 30 calls per month',
      'Basic analytics dashboard',
      'Call summaries & transcripts',
      'Email notifications',
      'Basic AI settings',
      'Email support',
    ],
    limits: {
      calls: '30 calls/month',
      minutes: '60 min/call max',
      support: 'Email',
    },
    popular: true,
    ctaText: 'Get Started',
    priceId: 'pri_01jx94f6qywr25x1cqnh0td7fy', // Your current Paddle sandbox price ID
  },
  {
    id: 'pro',
    name: 'Professional',
    description: 'For growing businesses',
    monthlyPrice: 30,
    annualPrice: 24,
    features: [
      'Unlimited calls & minutes',
      'Advanced analytics dashboard',
      'Advanced lead qualification',
      'CRM integrations (Webhook API)',
      'Real-time SMS & email alerts',
      'Custom call scripts & greetings',
      'Priority support',
    ],
    limits: {
      calls: 'Unlimited calls',
      minutes: 'Unlimited minutes',
      support: 'Priority email',
    },
    ctaText: 'Get Started',
    priceId: '', // TODO: Create Pro tier price ID in Paddle dashboard
  },
  {
    id: 'business',
    name: 'Business',
    description: 'For scaling enterprises',
    monthlyPrice: 0, // Contact sales
    annualPrice: 0, // Contact sales
    features: [
      'Everything in Professional',
      'Multi-language support',
      'Custom AI training & fine-tuning',
      'Dedicated phone numbers',
      'Advanced integrations (Zapier, etc.)',
      'Custom reporting & analytics',
      'Dedicated account manager',
      'SLA guarantee (99.9% uptime)',
    ],
    limits: {
      calls: 'Custom limits',
      minutes: 'Custom limits',
      support: 'Dedicated manager',
    },
    ctaText: 'Contact Sales',
    priceId: '', // Business tier is contact sales only
  },
];

function PricingContent() {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const [isAnnual, setIsAnnual] = useState(true);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

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

    if (!tier.priceId) {
      toast({
        title: 'Configuration Error',
        description:
          'Price ID not configured for this plan. Please contact support.',
        variant: 'destructive',
      });
      return;
    }

    setLoadingTier(tier.id);

    try {
      logger.info('PRICING_PAGE', 'Starting checkout process', {
        userId: logger.maskUserId(user.id),
        tierId: tier.id,
        priceId: tier.priceId,
      });

      const result = await createCheckoutSession(tier.priceId);

      if (result.success && result.checkoutUrl) {
        // Redirect to Paddle checkout
        window.location.href = result.checkoutUrl;
      } else {
        throw new Error(result.error || 'Failed to create checkout session');
      }
    } catch (error) {
      logger.error(
        'PRICING_PAGE',
        'Checkout failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          userId: logger.maskUserId(user.id),
          tierId: tier.id,
        }
      );

      toast({
        title: 'Checkout Failed',
        description:
          'Unable to start checkout. Please try again or contact support.',
        variant: 'destructive',
      });
    } finally {
      setLoadingTier(null);
    }
  };

  const getCurrentTierStatus = (tier: PricingTier) => {
    if (!hasActiveSubscription) {
      return tier.id === 'free' ? 'current' : 'available';
    }

    // Check if current subscription matches this tier
    if (subscription?.price_id === tier.priceId) {
      return 'current';
    }

    return 'available';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center space-x-2 text-sm font-medium text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Home</span>
            </Link>
            <div className="flex items-center space-x-4">
              {user ? (
                <Button asChild size="sm">
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-sm font-medium text-muted-foreground hover:text-primary"
                  >
                    Login
                  </Link>
                  <Button asChild size="sm">
                    <Link href="/signup">Sign Up</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-16">
        {/* Hero Section */}
        <div className="mb-16 text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight lg:text-5xl">
            Simple, Transparent Pricing
          </h1>
          <p className="mx-auto mb-8 max-w-3xl text-xl text-muted-foreground">
            Choose the perfect plan for your business. Start free, upgrade when
            you're ready.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center space-x-3 rounded-full border border-border bg-card/50 p-1 backdrop-blur-sm">
            <button
              onClick={() => setIsAnnual(false)}
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
              onClick={() => setIsAnnual(true)}
              className={cn(
                'relative rounded-full px-4 py-2 text-sm font-medium transition-all',
                isAnnual
                  ? 'bg-primary text-primary-foreground shadow-sm'
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
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-3 lg:gap-6">
          {pricingTiers.map(tier => {
            const price = isAnnual ? tier.annualPrice : tier.monthlyPrice;
            const yearlyTotal = tier.annualPrice * 12;
            const monthlyTotal = tier.monthlyPrice * 12;
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
                        <span className="text-3xl font-bold">
                          Contact Sales
                        </span>
                      ) : price === 0 ? (
                        <span className="text-4xl font-bold">Free</span>
                      ) : (
                        <>
                          <span className="text-4xl font-bold">${price}</span>
                          <span className="text-sm text-muted-foreground">
                            /month
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
                        ${tier.annualPrice}/month billed annually
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

        {/* Features Comparison */}
        <div className="mt-20">
          <h2 className="mb-12 text-center text-3xl font-bold">
            Why Choose Spoqen?
          </h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-3 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Enterprise Security</h3>
              <p className="text-sm text-muted-foreground">
                SOC2 compliant with end-to-end encryption
              </p>
            </div>
            <div className="space-y-3 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Lightning Fast</h3>
              <p className="text-sm text-muted-foreground">
                Sub-second response times with 99.9% uptime
              </p>
            </div>
            <div className="space-y-3 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Global Coverage</h3>
              <p className="text-sm text-muted-foreground">
                Available in 50+ countries with local numbers
              </p>
            </div>
            <div className="space-y-3 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Advanced Analytics</h3>
              <p className="text-sm text-muted-foreground">
                Deep insights into call performance and lead quality
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-20 text-center">
          <h2 className="mb-8 text-2xl font-bold">
            Frequently Asked Questions
          </h2>
          <div className="mx-auto max-w-3xl space-y-6 text-left">
            <div className="rounded-lg border p-6">
              <h3 className="mb-2 font-semibold">
                Can I change plans anytime?
              </h3>
              <p className="text-sm text-muted-foreground">
                Yes, you can upgrade or downgrade your plan at any time. Changes
                will be prorated and reflected in your next billing cycle.
              </p>
            </div>
            <div className="rounded-lg border p-6">
              <h3 className="mb-2 font-semibold">How does billing work?</h3>
              <p className="text-sm text-muted-foreground">
                All plans are billed monthly or annually. You can upgrade,
                downgrade, or cancel anytime from your dashboard.
              </p>
            </div>
            <div className="rounded-lg border p-6">
              <h3 className="mb-2 font-semibold">
                What happens if I exceed my limits?
              </h3>
              <p className="text-sm text-muted-foreground">
                On the Free plan, service will pause until the next billing
                cycle. Paid plans have no hard limits - we'll reach out about
                upgrading if usage is consistently high.
              </p>
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 space-y-6 text-center">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">No setup fees</span> •
            <span className="mx-1">Start immediately</span> •
            <span className="mx-1">Cancel anytime</span>
          </p>
          <p className="text-xs text-muted-foreground">
            ✓ Setup in 5 minutes • ✓ Money-back guarantee • ✓ No setup fees
          </p>
        </div>
      </main>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          Loading...
        </div>
      }
    >
      <PricingContent />
    </Suspense>
  );
}
