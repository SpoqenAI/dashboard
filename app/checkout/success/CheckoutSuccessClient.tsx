'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
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
      await router.push('/dashboard');
    } catch (error) {
      logger.error(
        'CHECKOUT_SUCCESS',
        'Failed to navigate to dashboard',
        error instanceof Error ? error : new Error(String(error)),
        {
          transactionId,
          targetRoute: '/dashboard',
        }
      );

      setNavigationError(
        'Unable to navigate to dashboard. Please try again or refresh the page.'
      );

      // Show error toast to user
      toast({
        title: 'Navigation Error',
        description: 'Unable to navigate to dashboard. Please try again.',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsNavigating(false);
    }
  };

  return (
    <>
      {navigationError && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">{navigationError}</p>
          </div>
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
            Continue to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </>
  );
}
