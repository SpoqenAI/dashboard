import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckoutSuccessClient } from './CheckoutSuccessClient';

interface CheckoutSuccessContentProps {
  transactionId?: string;
}

function CheckoutSuccessContent({
  transactionId,
}: CheckoutSuccessContentProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-600">
            Payment Successful!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Thank you for your purchase! Your subscription is now active and you
            can start using all the features.
          </p>

          {transactionId && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">
                Transaction ID: {transactionId}
              </p>
            </div>
          )}

          {/* Client component for interactive functionality */}
          <CheckoutSuccessClient transactionId={transactionId} />

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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <Skeleton className="mx-auto h-8 w-48" />
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="mx-auto h-4 w-3/4" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

interface CheckoutSuccessPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  // Await searchParams before accessing its properties
  const params = await searchParams;

  // Extract transaction ID from search params server-side
  const transactionId =
    typeof params._ptxn === 'string' ? params._ptxn : undefined;

  return (
    <Suspense fallback={<LoadingFallback />}>
      <CheckoutSuccessContent transactionId={transactionId} />
    </Suspense>
  );
}
