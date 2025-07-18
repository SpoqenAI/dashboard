'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';
import {
  getPaddleInstance,
  PaddleInlineCheckoutOptions,
} from '@/lib/paddle-js';

// Helper function to validate Paddle price IDs
function isValidPaddlePriceId(priceId: string): boolean {
  // Check basic format: pri_ followed by alphanumeric characters
  const priceIdPattern = /^pri_[a-zA-Z0-9]+$/;

  if (!priceIdPattern.test(priceId)) {
    return false;
  }

  // Get known price IDs from environment variables
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
  return true;
}

export default function CheckoutPage() {
  const { priceId } = useParams<{ priceId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  // Add nuqs for payment parameter management
  const [, setPayment] = useQueryState('payment');
  const [error, setError] = useState<string | null>(null);

  // Helper function to navigate to dashboard with payment processing
  const navigateToProcessing = () => {
    router.push('/dashboard');
    // Set payment parameter after navigation to ensure it's properly handled
    setTimeout(() => setPayment('processing'), 0);
  };

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!priceId || !isValidPaddlePriceId(priceId)) {
      setError('Invalid price identifier');
      return;
    }

    (async () => {
      try {
        const Paddle = await getPaddleInstance();

        // Render inline checkout frame
        const checkoutOptions: PaddleInlineCheckoutOptions = {
          items: [{ priceId, quantity: 1 }],
          customer: { email: user.email || '' },
          customData: { user_id: user.id },
          settings: {
            displayMode: 'inline',
            frameTarget: '#checkout-container',
            successUrl: `${window.location.origin}/api/paddle/success?user_id=${user.id}`,
          },
          events: {
            complete: () => {
              navigateToProcessing();
            },
            close: () => {
              router.back();
            },
          },
        };

        Paddle.Checkout.open(checkoutOptions);
      } catch (err: any) {
        logger.error(
          'CHECKOUT_PAGE',
          'Failed to open Paddle inline checkout',
          err instanceof Error ? err : new Error(String(err))
        );
        setError('Unable to start checkout. Please try again later.');
      }
    })();
  }, [user, priceId, router, setPayment]);

  // Handle error toast as a side effect
  useEffect(() => {
    if (error) {
      toast({
        title: 'Checkout error',
        description: error,
        variant: 'destructive',
      });
    }
  }, [error]);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <h1 className="mb-6 text-center text-2xl font-semibold">
        Secure Checkout
      </h1>
      <div id="checkout-container" className="mx-auto max-w-lg" />
    </div>
  );
}
