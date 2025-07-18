'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
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

  // Get known price IDs from environment variables
  const knownPriceIds = [
    process.env.NEXT_PUBLIC_PADDLE_STARTER_MONTHLY_PRICE_ID,
    process.env.NEXT_PUBLIC_PADDLE_STARTER_ANNUAL_PRICE_ID,
    process.env.NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID,
    process.env.NEXT_PUBLIC_PADDLE_PRO_ANNUAL_PRICE_ID,
  ].filter(Boolean);

  // If we have known price IDs configured, validate against them
  if (knownPriceIds.length > 0) {
    return knownPriceIds.includes(priceId);
  }

  // If no known price IDs are configured, just validate the format
  return true;
}

// Security: Validate that display price matches actual price ID
const validatePriceConsistency = (priceId: string, displayPrice: number): boolean => {
  const starterMonthlyId = process.env.NEXT_PUBLIC_PADDLE_STARTER_MONTHLY_PRICE_ID;
  const starterAnnualId = process.env.NEXT_PUBLIC_PADDLE_STARTER_ANNUAL_PRICE_ID;
  const proMonthlyId = process.env.NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID;
  const proAnnualId = process.env.NEXT_PUBLIC_PADDLE_PRO_ANNUAL_PRICE_ID;

  // Expected prices for each price ID (actual amounts charged)
  const expectedPrices: Record<string, number> = {
    [starterMonthlyId || '']: 10,     // $10/month
    [starterAnnualId || '']: 96,      // $96/year (not monthly equivalent)
    [proMonthlyId || '']: 30,         // $30/month  
    [proAnnualId || '']: 288,         // $288/year (not monthly equivalent)
  };

  const expectedPrice = expectedPrices[priceId];
  if (expectedPrice && Math.abs(displayPrice - expectedPrice) > 1) {
    console.warn(`Price mismatch detected: priceId ${priceId} shows $${displayPrice} but should be $${expectedPrice}`);
    return false;
  }

  return true;
};

// Plan configuration based on price IDs and URL parameters
const getPlanDetails = (priceId: string, searchParams?: { get: (key: string) => string | null }) => {
  // First, try to get plan info from URL parameters (passed from pricing page)
  if (searchParams) {
    const planName = searchParams.get('plan');
    const planPrice = searchParams.get('price');
    const billingCycle = searchParams.get('cycle') || 'Monthly';
    
    if (planName && planPrice) {
      const price = parseInt(planPrice, 10);
      
      // Security: Validate price consistency
      if (!validatePriceConsistency(priceId, price)) {
        console.warn('Price manipulation detected, falling back to price ID validation');
        // Fall through to environment variable validation
      } else {
        // Return plan details based on URL parameters (validated)
        if (planName.toLowerCase().includes('starter')) {
          return {
            name: 'Spoqen Starter',
            description: 'Perfect for small businesses getting started',
            price,
            billingCycle,
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
        
        if (planName.toLowerCase().includes('professional') || planName.toLowerCase().includes('pro')) {
          return {
            name: 'Spoqen Professional',
            description: 'For growing businesses with unlimited needs',
            price,
            billingCycle,
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
      }
    }
  }

  // Fallback to environment variable approach using specific price IDs
  const starterMonthlyId = process.env.NEXT_PUBLIC_PADDLE_STARTER_MONTHLY_PRICE_ID;
  const starterAnnualId = process.env.NEXT_PUBLIC_PADDLE_STARTER_ANNUAL_PRICE_ID;
  const proMonthlyId = process.env.NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID;
  const proAnnualId = process.env.NEXT_PUBLIC_PADDLE_PRO_ANNUAL_PRICE_ID;

  // Check for starter plans
  if (priceId === starterMonthlyId) {
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

  if (priceId === starterAnnualId) {
    return {
      name: 'Spoqen Starter',
      description: 'Perfect for small businesses getting started',
      price: 96, // $96 per year (20% discount from $120)
      billingCycle: 'Annual',
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

  // Check for pro plans
  if (priceId === proMonthlyId) {
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

  if (priceId === proAnnualId) {
    return {
      name: 'Spoqen Professional',
      description: 'For growing businesses with unlimited needs',
      price: 288, // $288 per year ($72 savings = 20% discount)
      billingCycle: 'Annual',
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

  // If no match found, return starter as fallback
  console.warn(`Unknown price ID: ${priceId}, defaulting to Starter plan`);
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
              ${planDetails.price}.00/{planDetails.billingCycle.toLowerCase() === 'annual' ? 'year' : planDetails.billingCycle.toLowerCase()}
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
  
  // nuqs query parameters for plan information
  const [planName] = useQueryState('plan');
  const [planPrice] = useQueryState('price');
  const [billingCycle] = useQueryState('cycle');
  const [, setPayment] = useQueryState('payment');
  
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [checkoutLoaded, setCheckoutLoaded] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  const priceId = params.priceId as string;
  const planDetails = useMemo(() => {
    // Create a simple object for URL parameters from nuqs
    const params = planName || planPrice || billingCycle ? {
      get: (key: string) => {
        switch (key) {
          case 'plan': return planName;
          case 'price': return planPrice;
          case 'cycle': return billingCycle;
          default: return null;
        }
      }
    } : undefined;
    
    return getPlanDetails(priceId, params);
  }, [priceId, planName, planPrice, billingCycle]);

  // Helper to navigate to processing with payment parameter
  const navigateToProcessing = useCallback(() => {
    logger.info('CHECKOUT_PAGE', 'Navigating to dashboard after successful payment');
    setPayment('success'); // Set payment status to success
    router.push('/dashboard');
  }, [setPayment, router]);

  // Auto-redirect mechanism for successful payments
  useEffect(() => {
    if (checkoutLoaded) {
      // Check for success indicators in the iframe periodically
      const checkForSuccess = () => {
        try {
          const iframe = document.querySelector('.paddle-checkout-container iframe') as HTMLIFrameElement;
          if (iframe && iframe.contentWindow) {
            // Look for success indicators in the URL or content
            const iframeUrl = iframe.src || '';
            if (iframeUrl.includes('success') || iframeUrl.includes('completed')) {
              logger.info('CHECKOUT_PAGE', 'Success detected in iframe URL, redirecting');
              navigateToProcessing();
              return;
            }
          }
        } catch (e) {
          // Cross-origin iframe access blocked, which is expected
        }

        // Check for success text in the iframe (if accessible)
        try {
          const container = document.querySelector('.paddle-checkout-container');
          if (container && container.textContent?.includes('completed successfully')) {
            logger.info('CHECKOUT_PAGE', 'Success text detected, redirecting');
            setPaymentCompleted(true);
            navigateToProcessing();
            return;
          }
        } catch (e) {
          // Ignore errors
        }
      };

      // Set up periodic checking for success
      const successCheckInterval = setInterval(checkForSuccess, 2000);
      
      // Clean up interval after 5 minutes
      const timeout = setTimeout(() => {
        clearInterval(successCheckInterval);
      }, 300000);

      return () => {
        clearInterval(successCheckInterval);
        clearTimeout(timeout);
      };
    }
  }, [checkoutLoaded, navigateToProcessing]);

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
              logger.info('CHECKOUT_PAGE', 'Paddle complete event fired');
              setPaymentCompleted(true);
              setTimeout(() => {
                navigateToProcessing();
              }, 1000);
            },
            close: () => {
              logger.info('CHECKOUT_PAGE', 'Checkout closed by user');
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
            ready: () => {
              logger.info('CHECKOUT_PAGE', 'Paddle ready event fired');
            },
            success: (data) => {
              logger.info('CHECKOUT_PAGE', 'Paddle success event fired', data);
              setPaymentCompleted(true);
              setTimeout(() => {
                navigateToProcessing();
              }, 1000);
            },
            payment: {
              completed: (data) => {
                logger.info('CHECKOUT_PAGE', 'Paddle payment.completed event fired', data);
                setPaymentCompleted(true);
                setTimeout(() => {
                  navigateToProcessing();
                }, 1000);
              },
              failed: (error) => {
                logger.error('CHECKOUT_PAGE', 'Paddle payment.failed event fired', error);
                setError('Payment failed. Please try again.');
              }
            }
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
                  className="paddle-checkout-container min-h-[600px] w-full relative"
                  style={{
                    background: 'transparent',
                  }}
                />
                
                {/* Manual Continue Button - shows when payment completed */}
                {paymentCompleted && (
                  <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <Check className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        Payment Successful!
                      </h3>
                      <p className="text-gray-600 max-w-sm">
                        Your subscription has been activated. Click below to continue to your dashboard.
                      </p>
                      <Button 
                        onClick={navigateToProcessing}
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                      >
                        Continue to Dashboard
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Loading State */}
                {isLoading && !checkoutLoaded && !paymentCompleted && (
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
