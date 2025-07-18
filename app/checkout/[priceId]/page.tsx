'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { ArrowLeft, ArrowRight, Check, Shield, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';
import { openInlineCheckout } from '@/lib/paddle-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// Helper function to validate Paddle price IDs
function isValidPaddlePriceId(priceId: string): boolean {
  // Check basic format: pri_ followed by alphanumeric characters
  const priceIdPattern = /^pri_[a-zA-Z0-9]+$/;

  if (!priceIdPattern.test(priceId)) {
    return false;
  }

  // Get known price IDs from environment variables (arrays)
  const starterPriceIds =
    process.env.NEXT_PUBLIC_PADDLE_STARTER_PRICE_IDS?.split(',') || [];
  const proPriceIds =
    process.env.NEXT_PUBLIC_PADDLE_PRO_PRICE_IDS?.split(',') || [];
  const businessPriceIds =
    process.env.NEXT_PUBLIC_PADDLE_BUSINESS_PRICE_IDS?.split(',') || [];

  const allKnownPriceIds = [
    ...starterPriceIds,
    ...proPriceIds,
    ...businessPriceIds,
  ];

  // If we have known price IDs configured, validate against them
  if (allKnownPriceIds.length > 0) {
    return allKnownPriceIds.includes(priceId);
  }

  // If no known price IDs are configured, just validate the format
  // This allows for flexible development and testing
  return true;
}

// Plan configuration based on price IDs
const getPlanDetails = (priceId: string) => {
  const starterPriceIds =
    process.env.NEXT_PUBLIC_PADDLE_STARTER_PRICE_IDS?.split(',') || [];
  const proPriceIds =
    process.env.NEXT_PUBLIC_PADDLE_PRO_PRICE_IDS?.split(',') || [];

  if (starterPriceIds.includes(priceId)) {
    return {
      name: 'Spoqen Starter',
      description: 'Perfect for small businesses getting started',
      price: 10,
      billingCycle: 'Monthly',
      features: [
        'Up to 30 calls per month',
        'Basic analytics dashboard',
        'Call summaries & transcripts',
        'Email notifications',
        'Basic AI settings',
        'Email support',
      ],
      color: 'from-blue-500 to-cyan-500',
    };
  }

  if (proPriceIds.includes(priceId)) {
    return {
      name: 'Spoqen Professional',
      description: 'For growing businesses with unlimited needs',
      price: 30,
      billingCycle: 'Monthly',
      features: [
        'Unlimited calls & minutes',
        'Advanced analytics & reports',
        'Custom AI training',
        'Webhook integrations',
        'CRM integrations',
        'Priority support',
      ],
      color: 'from-purple-500 to-pink-500',
    };
  }

  // Default fallback
  return {
    name: 'Spoqen Plan',
    description: 'Your selected subscription plan',
    price: 0,
    billingCycle: 'Monthly',
    features: ['Premium AI assistant features'],
    color: 'from-gray-500 to-gray-600',
  };
};

// Order Summary Component
function OrderSummary({ priceId }: { priceId: string }) {
  const planDetails = getPlanDetails(priceId);

  return (
    <Card className="h-fit border-gray-700/50 bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-white">
            Order Summary
          </CardTitle>
          <Badge
            className={`bg-gradient-to-r ${planDetails.color} border-0 text-white`}
          >
            Popular
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Plan Details */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div
              className={`rounded-lg bg-gradient-to-r p-2 ${planDetails.color}`}
            >
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">{planDetails.name}</h3>
              <p className="text-sm text-gray-400">{planDetails.description}</p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-3">
          <h4 className="font-medium text-white">What's included:</h4>
          <ul className="space-y-2">
            {planDetails.features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 flex-shrink-0 text-green-400" />
                <span className="text-gray-300">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Pricing Breakdown */}
        <div className="space-y-3 border-t border-gray-600/50 pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Subtotal</span>
            <span className="text-white">${planDetails.price}.00</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Tax</span>
            <span className="text-white">Calculated at checkout</span>
          </div>
          <div className="flex justify-between border-t border-gray-600/50 pt-2 text-lg font-semibold">
            <span className="text-white">Total</span>
            <span className="text-white">
              ${planDetails.price}.00/{planDetails.billingCycle.toLowerCase()}
            </span>
          </div>
        </div>

        {/* Security Badge */}
        <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 p-3">
          <Shield className="h-4 w-4 text-green-400" />
          <span className="text-sm text-green-300">
            Secure payment powered by Paddle
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// Loading Skeleton for Checkout Frame
function CheckoutFrameSkeleton() {
  return (
    <Card className="bg-white">
      <CardContent className="p-6">
        <div className="space-y-6">
          <Skeleton className="h-8 w-3/4" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-12 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [, setPayment] = useQueryState('payment');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [checkoutLoaded, setCheckoutLoaded] = useState(false);

  const priceId = params.priceId as string;
  const planDetails = useMemo(() => getPlanDetails(priceId), [priceId]);

  // Helper to navigate to processing with payment parameter
  const navigateToProcessing = () => {
    setPayment('processing');
    router.push('/dashboard');
  };

  useEffect(() => {
    if (!user || !priceId) return;

    if (!isValidPaddlePriceId(priceId)) {
      setError('Invalid subscription plan selected.');
      setIsLoading(false);
      return;
    }

    const initializeCheckout = async () => {
      try {
        logger.info('CHECKOUT_PAGE', 'Initializing Paddle inline checkout', {
          priceId,
          userId: user.id,
          planName: planDetails.name,
        });

        // Wait a bit for the DOM to be ready and verify the container exists
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const container = document.querySelector('.paddle-checkout-container');
        if (!container) {
          throw new Error('Checkout container element not found in DOM');
        }

        logger.info('CHECKOUT_PAGE', 'Container element found, initializing Paddle', {
          containerClass: 'paddle-checkout-container',
        });

        // Initialize inline checkout - pass the class name
        await openInlineCheckout(
          'paddle-checkout-container', // Pass the class name
          priceId,
          user.email || '',
          {
            user_id: user.id,
          },
          {
            complete: () => {
              logger.info('CHECKOUT_PAGE', 'Checkout completed successfully');
              navigateToProcessing();
            },
            close: () => {
              logger.info('CHECKOUT_PAGE', 'Checkout closed by user');
              // Don't navigate away on close - let user stay on page
            },
            error: (error) => {
              logger.error('CHECKOUT_PAGE', 'Checkout error', error);
              setError('Payment failed. Please try again.');
            },
            loaded: () => {
              logger.info('CHECKOUT_PAGE', 'Checkout iframe loaded');
              setCheckoutLoaded(true);
              setIsLoading(false);
            },
          }
        );
      } catch (err: any) {
        logger.error(
          'CHECKOUT_PAGE',
          'Failed to initialize Paddle inline checkout',
          err instanceof Error ? err : new Error(String(err))
        );
        setError('Unable to start checkout. Please try again later.');
        setIsLoading(false);
      }
    };

    initializeCheckout();
  }, [user, priceId, planDetails.name, router, setPayment]);

  // Handle error toast as a side effect
  useEffect(() => {
    if (error) {
      toast({
        title: 'Checkout Error',
        description: error,
        variant: 'destructive',
      });
    }
  }, [error]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center text-white">
          <h1 className="mb-2 text-2xl font-bold">Loading...</h1>
          <p className="text-gray-400">Preparing your checkout experience</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        <Card className="w-full max-w-md border-red-500/50 bg-red-900/20">
          <CardContent className="py-8 text-center">
            <h1 className="mb-2 text-2xl font-bold text-red-400">
              Checkout Error
            </h1>
            <p className="mb-6 text-gray-300">{error}</p>
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="border-b border-gray-700/50 bg-gray-900/50 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">Checkout</h1>
              <ArrowRight className="h-4 w-4 text-gray-500" />
              <span className="text-gray-400">{planDetails.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Left Column - Order Summary */}
          <div className="order-2 lg:order-1">
            <OrderSummary priceId={priceId} />
          </div>

          {/* Right Column - Checkout Frame */}
          <div className="order-1 lg:order-2">
            <Card className="bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-gray-900">
                  Complete Your Purchase
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Checkout Container */}
                <div
                  className="paddle-checkout-container min-h-[600px] w-full"
                  style={{
                    background: 'transparent',
                  }}
                />

                {/* Loading State */}
                {isLoading && !checkoutLoaded && (
                  <div className="absolute inset-0 bg-white">
                    <CheckoutFrameSkeleton />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
