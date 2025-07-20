'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import { getPaddleInstance, generateSuccessUrl } from '@/lib/paddle-js';
import { logger } from '@/lib/logger';
import type { PaddleCheckoutOptions } from '@/lib/paddle-js';

interface SubscriptionFormProps {
  userEmail: string;
  userName: string;
  businessName: string;
  userId: string;
}

export function SubscriptionForm({
  userEmail,
  userName,
  businessName,
  userId,
}: SubscriptionFormProps) {
  const router = useRouter();
  const [checkoutInProgress, setCheckoutInProgress] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [pricingData, setPricingData] = useState<{
    starterPrice: string;
  } | null>(null);

  const navigateToSuccess = () => {
    router.push('/checkout/success');
  };

  // Fetch pricing data with retry logic
  useEffect(() => {
    const fetchPricing = async (retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          const response = await fetch('/api/paddle/pricing');
          if (!response.ok) {
            throw new Error('Failed to fetch pricing data');
          }
          const data = await response.json();
          setPricingData(data);
          return;
        } catch (error) {
          if (i === retries - 1) {
            logger.error(
              'SUBSCRIPTION_FORM',
              'Failed to fetch pricing data',
              error instanceof Error ? error : new Error(String(error))
            );
            setPricingError(
              'Unable to load subscription options. Please refresh the page.'
            );
          } else {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve =>
              setTimeout(resolve, 1000 * Math.pow(2, i))
            );
          }
        }
      }
    };

    fetchPricing();
  }, []);

  useEffect(() => {
    if (pricingData?.starterPrice) {
      setSelectedPlan(pricingData.starterPrice);
    }
  }, [pricingData]);

  const handlePaddleCheckout = async () => {
    if (!selectedPlan) {
      logger.error(
        'SUBSCRIPTION_FORM',
        'Cannot start Paddle checkout: No plan selected'
      );
      return;
    }

    try {
      logger.info('SUBSCRIPTION_FORM', 'Starting Paddle v2 checkout', {
        priceId: selectedPlan,
        userId,
        userEmail,
      });

      // Get Paddle instance
      const Paddle = await getPaddleInstance();

      const checkoutOptions: PaddleCheckoutOptions = {
        items: [
          {
            priceId: selectedPlan,
            quantity: 1,
          },
        ],
        customer: {
          email: userEmail,
          name: userName,
        },
        customData: {
          user_id: userId,
        },
        settings: {
          successUrl: generateSuccessUrl('/api/paddle/success', {
            user_id: userId,
          }),
        },
        events: {
          close: () => {
            setCheckoutInProgress(false);
          },
          complete: () => {
            navigateToSuccess();
            router.prefetch('/dashboard');
          },
        },
      };

      setCheckoutInProgress(true);
      Paddle.Checkout.open(checkoutOptions);
    } catch (error) {
      logger.error(
        'SUBSCRIPTION_FORM',
        'Failed to open Paddle v2 checkout',
        error instanceof Error ? error : new Error(String(error))
      );
      setCheckoutInProgress(false);
      setInitError('Payment system initialization failed. Please try again.');
    }
  };

  return (
    <>
      <CardContent className="space-y-6">
        {/* Plan Details */}
        <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">Professional Plan</h3>
              <p className="text-muted-foreground">
                Perfect for real estate professionals
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">$30</div>
              <div className="text-sm text-muted-foreground">/month</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-600" />
              <span>Unlimited AI call answering</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-600" />
              <span>Customizable greeting and responses</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-600" />
              <span>Instant email call summaries</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-600" />
              <span>Lead qualification questions</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-600" />
              <span>Basic analytics and reporting</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-600" />
              <span>24/7 customer support</span>
            </div>
          </div>
        </div>

        {/* What happens next */}
        <div className="rounded-md bg-muted p-4">
          <h4 className="mb-2 font-medium">What happens next:</h4>
          <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
            <li>Complete your subscription payment</li>
            <li>Your AI assistant will be activated immediately</li>
            <li>You'll receive setup instructions via email</li>
            <li>Start receiving intelligent call handling right away</li>
          </ol>
        </div>

        {/* Error Message */}
        {pricingError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-red-800">
                  Subscription Unavailable
                </h4>
                <p className="mt-1 text-sm text-red-700">{pricingError}</p>
                <p className="mt-2 text-sm text-red-600">
                  Please refresh the page to try again. If the problem persists,
                  contact support.
                </p>
              </div>
            </div>
          </div>
        )}
        {/* Polling Timeout Message */}
        {checkoutInProgress && (
          <div className="mt-4 rounded-md border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10A8 8 0 11.001 10 8 8 0 0118 10zm-8 3a1 1 0 100-2 1 1 0 000 2zm.75-7a.75.75 0 00-1.5 0v4a.75.75 0 001.5 0V6z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-yellow-800">
                  Subscription not detected
                </h4>
                <p className="mt-1 text-sm text-yellow-700">
                  We couldn't confirm your subscription within 2 minutes. If you
                  completed payment, please refresh the page or contact support.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Customer Info */}
        {userEmail && (
          <div className="text-sm text-muted-foreground">
            <p>
              <strong>Account:</strong> {userEmail}
            </p>
            {userName && (
              <p>
                <strong>Name:</strong> {userName}
              </p>
            )}
            {businessName && (
              <p>
                <strong>Business:</strong> {businessName}
              </p>
            )}
          </div>
        )}
      </CardContent>

      <CardHeader className="border-t bg-muted/50">
        <div className="flex w-full items-center justify-between">
          <div>
            <CardTitle className="text-lg">Ready to get started?</CardTitle>
            <p className="text-sm text-muted-foreground">
              Complete your subscription to activate your AI assistant
            </p>
          </div>
          <Button
            onClick={handlePaddleCheckout}
            disabled={checkoutInProgress || !!pricingError || !!initError}
            className="min-w-[140px]"
          >
            {checkoutInProgress ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Subscribe Now'
            )}
          </Button>
        </div>
      </CardHeader>

      {/* Initialization Error */}
      {initError && (
        <div className="border-t bg-red-50 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-red-800">
                Payment System Error
              </h4>
              <p className="mt-1 text-sm text-red-700">{initError}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
