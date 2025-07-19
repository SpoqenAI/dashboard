'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { ArrowLeft, Shield, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  type Environments,
  initializePaddle,
  type Paddle,
} from '@paddle/paddle-js';
import type { CheckoutEventsData } from '@paddle/paddle-js/types/checkout/events';
import throttle from 'lodash-es/throttle';
import {
  generateSuccessUrl,
  type PaddleCheckoutOptions,
} from '@/lib/paddle-js';

// Helper function to validate Paddle price IDs
function isValidPaddlePriceId(priceId: string): boolean {
  return typeof priceId === 'string' && priceId.startsWith('pri_');
}

// Determine plan based on price ID
function getPlanFromPriceId(priceId: string) {
  // Your price ID mapping logic here
  const planMap: Record<string, string> = {
    pri_01k0admysy9c1xxxq8g5ajfcqv: 'Spoqen Starter',
    // Add more price IDs as needed
  };

  return planMap[priceId] || 'Unknown Plan';
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [plan] = useQueryState('plan');
  const [price] = useQueryState('price');
  const [cycle] = useQueryState('cycle');

  const [quantity, setQuantity] = useState<number>(1);
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [checkoutData, setCheckoutData] = useState<CheckoutEventsData | null>(
    null
  );
  const [checkoutLoaded, setCheckoutLoaded] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(
    null
  );
  const initializationRef = useRef(false);

  // Get price ID from URL params
  const priceId = Array.isArray(params.priceId)
    ? params.priceId[0]
    : params.priceId;

  // Validate price ID
  const isValidPrice = useMemo(() => {
    return priceId && isValidPaddlePriceId(priceId);
  }, [priceId]);

  // Get plan name
  const planName = useMemo(() => {
    return priceId ? getPlanFromPriceId(priceId) : 'Unknown Plan';
  }, [priceId]);

  // Format display values
  const displayPrice = price
    ? `$${price}`
    : checkoutData?.totals.total
      ? `$${(checkoutData.totals.total / 100).toFixed(2)}`
      : 'Loading...';
  const displayCycle = cycle
    ? cycle.charAt(0).toUpperCase() + cycle.slice(1)
    : '';
  const displayPlan = plan || planName;

  // Handle checkout events
  const handleCheckoutEvents = useCallback((event: CheckoutEventsData) => {
    setCheckoutData(event);
    logger.info('CHECKOUT_PAGE', 'Checkout event received', {
      eventType: 'checkout_event',
      total: event.totals?.total,
      currency: event.currency_code,
    });
  }, []);

  // Update items throttled
  const updateItems = useCallback(
    throttle((paddle: Paddle, priceId: string, quantity: number) => {
      if (paddle.Initialized) {
        paddle.Checkout.updateItems([{ priceId, quantity }]);
      }
    }, 1000),
    []
  );

  // Initialize Paddle checkout
  useEffect(() => {
    if (
      !paddle?.Initialized &&
      process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN &&
      process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT &&
      user?.email &&
      isValidPrice &&
      !initializationRef.current
    ) {
      initializationRef.current = true;

      initializePaddle({
        token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
        environment: process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT as Environments,
        eventCallback: event => {
          if (event.data && event.name) {
            handleCheckoutEvents(event.data);
          }
        },
        checkout: {
          settings: {
            variant: 'one-page',
            displayMode: 'inline',
            theme: 'dark',
            allowLogout: false,
            frameTarget: 'paddle-checkout-frame',
            frameInitialHeight: 450,
            frameStyle:
              'width: 100%; background-color: transparent; border: none',
            successUrl: generateSuccessUrl('/checkout/success'),
          },
        },
      })
        .then(async paddleInstance => {
          if (paddleInstance && priceId) {
            setPaddle(paddleInstance);

            logger.info('CHECKOUT_PAGE', 'Opening Paddle checkout', {
              priceId,
              userEmail: user.email ? '[REDACTED]' : 'none',
            });

            const checkoutOptions: PaddleCheckoutOptions = {
              ...(user.email && { customer: { email: user.email } }),
              items: [{ priceId: priceId, quantity: 1 }],
            };

            paddleInstance.Checkout.open(checkoutOptions);

            setCheckoutLoaded(true);
          }
        })
        .catch(error => {
          logger.error('CHECKOUT_PAGE', 'Failed to initialize Paddle', error);
          setInitializationError(
            'Failed to initialize checkout. Please refresh and try again.'
          );
          initializationRef.current = false;
        });
    }
  }, [
    paddle?.Initialized,
    priceId,
    user?.email,
    isValidPrice,
    handleCheckoutEvents,
  ]);

  // Update items when quantity changes
  useEffect(() => {
    if (paddle && priceId && paddle.Initialized) {
      updateItems(paddle, priceId, quantity);
    }
  }, [paddle, priceId, quantity, updateItems]);

  // Handle initialization error toast
  useEffect(() => {
    if (initializationError) {
      toast({
        title: 'Checkout Error',
        description: initializationError,
        variant: 'destructive',
      });
      // Clear the error after showing the toast
      setInitializationError(null);
    }
  }, [initializationError]);

  // Handle navigation
  const navigateBack = () => {
    router.push('/pricing');
  };

  // Render loading state
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Skeleton className="mx-auto mb-4 h-8 w-48" />
          <Skeleton className="mx-auto h-4 w-32" />
        </div>
      </div>
    );
  }

  // Render invalid price ID error
  if (!isValidPrice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Invalid Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              The selected plan is not valid. Please choose a plan from our
              pricing page.
            </p>
            <Button onClick={navigateBack} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Pricing
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-8 flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={navigateBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Pricing
            </Button>
            <div className="h-4 w-px bg-border" />
            <h1 className="text-2xl font-bold">Complete Your Purchase</h1>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Order Summary */}
            <div className="order-2 lg:order-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Plan Details */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{displayPlan}</h3>
                        {displayCycle && (
                          <p className="text-sm text-muted-foreground">
                            Billed {displayCycle}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary" className="ml-2">
                        <Sparkles className="mr-1 h-3 w-3" />
                        Popular
                      </Badge>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="space-y-2 border-t pt-4">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{displayPrice}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 text-lg font-semibold">
                      <span>Total</span>
                      <span>{displayPrice}</span>
                    </div>
                  </div>

                  {/* Security Notice */}
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-sm text-muted-foreground">
                      <Shield className="mr-2 inline h-4 w-4" />
                      Secure checkout powered by Paddle. Your payment
                      information is encrypted and secure.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Checkout Form */}
            <div className="order-1 lg:order-2">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Details</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Paddle Checkout Container */}
                  <div
                    className="paddle-checkout-frame"
                    style={{
                      minHeight: '500px',
                      width: '100%',
                      border: 'none',
                      background: 'transparent',
                    }}
                  >
                    {!checkoutLoaded && (
                      <div className="flex h-64 items-center justify-center">
                        <div className="space-y-4 text-center">
                          <Skeleton className="mx-auto h-8 w-48" />
                          <Skeleton className="mx-auto h-4 w-32" />
                          <p className="text-sm text-muted-foreground">
                            Loading secure checkout...
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status Message */}
                  {checkoutLoaded && (
                    <div className="mt-4 text-center">
                      <p className="text-xs text-muted-foreground">
                        You'll be redirected automatically after payment.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
