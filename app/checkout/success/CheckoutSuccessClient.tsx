'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface CheckoutSuccessClientProps {
  transactionId?: string;
}

export function CheckoutSuccessClient({
  transactionId,
}: CheckoutSuccessClientProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

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

  const handleContinue = () => {
    setIsNavigating(true);
    
    // router.push doesn't throw errors in Next.js App Router
    // It's designed to be fire-and-forget
    router.push('/recent-calls');
    
    // Reset navigation state after a short delay
    // This allows the UI to show the loading state briefly
    setTimeout(() => {
      setIsNavigating(false);
    }, 1000);
  };

  return (
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
  );
}