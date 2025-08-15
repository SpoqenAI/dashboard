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

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// Client components for interactive functionality
import { PricingHeader } from './components/pricing-header';
import { BillingToggle, BillingProvider } from './components/billing-toggle';
import { PricingGrid } from './components/pricing-grid';

// Use environment variables for Paddle price IDs (monthly/annual)
const priceIds = {
  starter: {
    monthly:
      process.env.NEXT_PUBLIC_PADDLE_STARTER_MONTHLY_PRICE_ID ||
      process.env.NEXT_PUBLIC_PADDLE_PRICE_ID || // legacy env var fallback
      '',
    annual: process.env.NEXT_PUBLIC_PADDLE_STARTER_ANNUAL_PRICE_ID || '',
  },
  pro: {
    monthly: process.env.NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID || '',
    annual: process.env.NEXT_PUBLIC_PADDLE_PRO_ANNUAL_PRICE_ID || '',
  },
};

export interface PricingTier {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  popular?: boolean;
  ctaText: string;
  priceIdMonthly: string;
  priceIdAnnual: string;
  limits: {
    calls: string;
    minutes: string;
    support: string;
  };
}

export const pricingTiers: PricingTier[] = [
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
    priceIdMonthly: '',
    priceIdAnnual: '',
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'For small businesses getting started',
    monthlyPrice: 10,
    annualPrice: 96, // $96/year (20% discount from $120)
    features: [
      'Up to 30 calls per month',
      'Analytics dashboard',
      'Call summaries & transcripts',
      'Email notifications',
      'Basic AI settings',
    ],
    limits: {
      calls: '30 calls/month',
      minutes: '60 min/call max',
      support: 'Email',
    },
    popular: true,
    ctaText: 'Get Started',
    priceIdMonthly: priceIds.starter.monthly,
    priceIdAnnual: priceIds.starter.annual,
  },
  {
    id: 'pro',
    name: 'Professional',
    description: 'For growing businesses',
    monthlyPrice: 30, // Confirmed correct price
    annualPrice: 288, // $288/year ($24/month equivalent, $72/year savings = 20% discount)
    features: ['Everything in Starter', 'Unlimited calls & minutes'],
    limits: {
      calls: 'Unlimited calls',
      minutes: 'Unlimited minutes',
      support: 'Priority email',
    },
    ctaText: 'Get Started',
    priceIdMonthly: priceIds.pro.monthly,
    priceIdAnnual: priceIds.pro.annual,
  },
  {
    id: 'business',
    name: 'Business',
    description: 'For scaling enterprises',
    monthlyPrice: 0, // Contact sales
    annualPrice: 0, // Contact sales
    features: ['Everything in Professional', 'Customized for your needs'],
    limits: {
      calls: 'Unlimited calls',
      minutes: 'Unlimited minutes',
      support: 'Phone & video',
    },
    ctaText: 'Contact Sales',
    priceIdMonthly: '',
    priceIdAnnual: '',
  },
];

const faqItems = [
  {
    question: 'Can I change plans anytime?',
    answer:
      'Yes! You can upgrade or downgrade your plan at any time from your dashboard. Changes take effect immediately.',
  },
  {
    question: 'What happens during the free trial?',
    answer:
      "Start with our Free plan to set up your AI assistant. When you're ready for calls, upgrade to Starter or Pro for full functionality.",
  },
  {
    question: 'Do you offer refunds?',
    answer:
      'Yes, we offer a 30-day money-back guarantee on all paid plans. Contact support for assistance.',
  },
  {
    question: 'How does billing work?',
    answer:
      'All plans are billed monthly or annually. You can upgrade, downgrade, or cancel anytime from your dashboard.',
  },
  {
    question: 'What happens if I exceed my limits?',
    answer:
      "On the Free plan, service will pause until the next billing cycle. Paid plans have no hard limits - we'll reach out about upgrading if usage is consistently high.",
  },
];

export default function PricingPage() {
  return (
    <BillingProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <PricingHeader />

        {/* Main Content */}
        <main className="container mx-auto px-6 py-16">
          {/* Hero Section */}
          <div className="mb-16 text-center">
            <div className="mx-auto max-w-4xl pb-12 sm:pb-14 md:pb-16 lg:pb-20">
              <h1 className="mb-6 text-4xl font-bold tracking-tight lg:text-5xl">
                Simple, Transparent Pricing
              </h1>
              <p className="mx-auto mb-0 max-w-3xl text-xl text-muted-foreground">
                Choose the perfect plan for your business. Start free, upgrade
                when you're ready.
              </p>
            </div>

            {/* Billing Toggle */}
            <div className="inline-block"><BillingToggle /></div>
          </div>

          {/* Pricing Grid */}
          <Suspense fallback={<div>Loading pricing...</div>}>
            <PricingGrid pricingTiers={pricingTiers} />
          </Suspense>

          {/* Features Comparison */}
          <div className="mt-24">
            <h2 className="mb-12 text-center text-3xl font-bold">
              Everything you need to automate your calls
            </h2>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              <div className="text-center">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950">
                  <Zap className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">
                  Lightning Fast Setup
                </h3>
                <p className="text-muted-foreground">
                  Get your AI assistant running in under 5 minutes with our
                  intuitive setup wizard.
                </p>
              </div>
              <div className="text-center">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-600 dark:bg-green-950">
                  <Shield className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">
                  Enterprise Security
                </h3>
                <p className="text-muted-foreground">
                  Bank-grade encryption and security measures to protect your
                  business data and calls.
                </p>
              </div>
              <div className="text-center">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-purple-50 text-purple-600 dark:bg-purple-950">
                  <BarChart3 className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">
                  Advanced Analytics
                </h3>
                <p className="text-muted-foreground">
                  Detailed insights and analytics to optimize your call
                  performance and conversion rates.
                </p>
              </div>
              <div className="text-center">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-orange-600 dark:bg-orange-950">
                  <Globe className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">
                  Multi-Language Support
                </h3>
                <p className="text-muted-foreground">
                  Support for multiple languages to serve your global customer
                  base effectively.
                </p>
              </div>
              <div className="text-center">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950">
                  <Headphones className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">24/7 Support</h3>
                <p className="text-muted-foreground">
                  Round-the-clock support to ensure your AI assistant is always
                  performing at its best.
                </p>
              </div>
              <div className="text-center">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-teal-600 dark:bg-teal-950">
                  <Star className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Premium Quality</h3>
                <p className="text-muted-foreground">
                  High-quality voice AI powered by the latest technology for
                  natural conversations.
                </p>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-24">
            <h2 className="mb-12 text-center text-3xl font-bold">
              Frequently Asked Questions
            </h2>
            <div className="mx-auto max-w-3xl space-y-6">
              {faqItems.map((item, index) => (
                <div key={index} className="rounded-lg border p-6">
                  <h3 className="mb-2 font-semibold">{item.question}</h3>
                  <p className="text-sm text-muted-foreground">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 space-y-6 text-center">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">No setup fees</span>{' '}
              •<span className="mx-1">Start immediately</span> •
              <span className="mx-1">Cancel anytime</span>
            </p>
            <p className="text-xs text-muted-foreground">
              ✓ Setup in 5 minutes • ✓ Money-back guarantee • ✓ No setup fees
            </p>
          </div>
        </main>
      </div>
    </BillingProvider>
  );
}
