'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';

interface CheckoutSuccessClientProps {
  transactionId?: string;
}

export function CheckoutSuccessClient({
  transactionId,
}: CheckoutSuccessClientProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationError, setNavigationError] = useState<string | null>(null);

  useEffect(() => {
    // Show success toast
    const { dismiss } = toast({
      title: 'Payment Successful!',
      description: 'Welcome to Spoqen! Your subscription is now active.',
      duration: 6000,
    });

    return () => {
      dismiss();
    };
  }, []);

  const handleContinue = async () => {
    setIsNavigating(true);
    setNavigationError(null);

    try {
      // router.push doesn't throw errors in Next.js App Router
      // It's designed to be fire-and-forget
      router.push('/recent-calls');
    } catch (error) {
      logger.error(
        'CHECKOUT_SUCCESS',
        'Failed to navigate to recent calls',
        error instanceof Error ? error : new Error(String(error)),
        {
          transactionId,
          targetRoute: '/recent-calls',
        }
      );

      setNavigationError(
        'Unable to navigate to recent calls. Please try again or refresh the page.'
      );

      // Show error toast to user
      toast({
        title: 'Navigation Error',
        description: 'Unable to navigate to recent calls. Please try again.',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      // Reset navigation state after a short delay
      // This allows the UI to show the loading state briefly
      setTimeout(() => {
        setIsNavigating(false);
      }, 1000);
    }
  };

  return (
    <>
      {navigationError && (
        <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          {navigationError}
        </div>
      )}

      <Button
        onClick={handleContinue}
        className="w-full"
        disabled={isNavigating}
      >
        {isNavigating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Navigating...
          </>
        ) : (
          <>
            Continue to Recent Calls
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </>
  );
}
