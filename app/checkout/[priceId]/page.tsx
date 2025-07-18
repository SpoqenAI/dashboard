'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';
import { getPaddleInstance } from '@/lib/paddle-js';

export default function CheckoutPage() {
  const { priceId } = useParams<{ priceId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!priceId || !priceId.startsWith('pri_')) {
      setError('Invalid price identifier');
      return;
    }

    (async () => {
      try {
        const env =
          (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT as
            | 'sandbox'
            | 'production') || 'production';
        const Paddle = await getPaddleInstance(env);

        // Render inline checkout frame
        Paddle.Checkout.open({
          items: [{ priceId, quantity: 1 }],
          customer: { email: user.email },
          customData: { user_id: user.id },
          settings: {
            displayMode: 'inline',
            frameTarget: '#checkout-container',
            successUrl: `${window.location.origin}/api/paddle/success?user_id=${user.id}`,
          },
          events: {
            complete: () => {
              router.push('/dashboard?payment=processing');
            },
            close: () => {
              router.back();
            },
          },
        } as any);
      } catch (err: any) {
        logger.error(
          'CHECKOUT_PAGE',
          'Failed to open Paddle inline checkout',
          err instanceof Error ? err : new Error(String(err))
        );
        setError('Unable to start checkout. Please try again later.');
      }
    })();
  }, [user, priceId, router]);

  if (error) {
    toast({
      title: 'Checkout error',
      description: error,
      variant: 'destructive',
    });
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
