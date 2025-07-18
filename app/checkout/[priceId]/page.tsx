'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';
import { getPaddleInstance } from '@/lib/paddle-js';

// Helper function to validate Paddle price IDs
function isValidPaddlePriceId(priceId: string): boolean {
  // Check basic format: pri_ followed by alphanumeric characters
  const priceIdPattern = /^pri_[a-zA-Z0-9]+$/;

  if (!priceIdPattern.test(priceId)) {
    return false;
  }

  // Get known price IDs from environment variables
  const starterPriceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID;
  const proPriceId = process.env.NEXT_PUBLIC_PADDLE_PRO_PRICE_ID;

  // Check if the priceId matches any of the known price IDs
  const knownPriceIds = [starterPriceId, proPriceId].filter(Boolean);

  return knownPriceIds.includes(priceId);
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [, setPayment] = useQueryState('payment');
  const [error, setError] = useState<string>('');

  const priceId = params.priceId as string;

  // Helper to navigate to processing with payment parameter
  const navigateToProcessing = () => {
    setPayment('processing');
    router.push('/dashboard');
  };

  useEffect(() => {
    if (!user || !priceId) return;

    if (!isValidPaddlePriceId(priceId)) {
      setError('Invalid subscription plan selected.');
      return;
    }

    (async () => {
      try {
        logger.info('CHECKOUT_PAGE', 'Opening Paddle v2 inline checkout', {
          priceId,
          userId: user.id,
        });

        const Paddle = await getPaddleInstance();

        const checkoutOptions = {
          items: [
            {
              priceId: priceId,
              quantity: 1,
            },
          ],
          customer: {
            email: user.email || '',
            name: user.user_metadata?.name || '',
          },
          customData: {
            user_id: user.id,
          },
          successUrl: `${window.location.origin}/api/paddle/success?user_id=${user.id}`,
          events: {
            complete: () => {
              navigateToProcessing();
            },
            close: () => {
              router.back();
            },
          },
        } as any; // Type assertion for v2 transition

        Paddle.Checkout.open(checkoutOptions);
      } catch (err: any) {
        logger.error(
          'CHECKOUT_PAGE',
          'Failed to open Paddle v2 checkout',
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
        title: 'Checkout Error',
        description: error,
        variant: 'destructive',
      });
    }
  }, [error]);

  if (!user) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Checkout Error</h1>
          <p className="mt-2 text-gray-600">{error}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Setting up checkout...</h1>
        <p className="mt-2 text-gray-600">
          Please wait while we prepare your subscription.
        </p>
      </div>
    </div>
  );
}
