'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';

function CheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get any URL parameters that Paddle might pass
  const transactionId = searchParams.get('_ptxn');

  useEffect(() => {
    // Show success toast
    toast({
      title: 'Payment Successful!',
      description: 'Welcome to Spoqen! Your subscription is now active.',
      duration: 6000,
    });
  }, []);

  const handleContinue = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-600">Payment Successful!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Thank you for your purchase! Your subscription is now active and you can start using all the features.
          </p>
          
          {transactionId && (
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">
                Transaction ID: {transactionId}
              </p>
            </div>
          )}

          <Button onClick={handleContinue} className="w-full">
            Continue to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <p className="text-xs text-muted-foreground">
            You should receive a confirmation email shortly.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <Skeleton className="h-8 w-48 mx-auto" />
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4 mx-auto" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}