'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { ArrowLeft, Check, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { initializePaddle, Paddle, CheckoutOpenOptions } from '@paddle/paddle-js';
import { logger } from '@/lib/logger';

interface SubscriptionFormProps {
  userEmail: string;
  userName: string;
  businessName: string;
  userId: string;
}

export function SubscriptionForm({ userEmail, userName, businessName, userId }: SubscriptionFormProps) {
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const initPaddle = async () => {
      // Safely validate environment variable (outside try block for error logging)
      const envValue = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT;
      const environment: 'sandbox' | 'production' = envValue === 'production' ? 'production' : 'sandbox';
      
      try {
        setInitError(null); // Clear any previous errors
        
        const paddleInstance = await initializePaddle({
          environment,
          token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
        });
        if (paddleInstance) {
          setPaddle(paddleInstance);
        } else {
          throw new Error('Paddle initialization returned undefined');
        }
      } catch (error) {
        logger.error(
          'SUBSCRIPTION_FORM',
          'Failed to initialize Paddle payment system',
          error instanceof Error ? error : new Error(String(error)),
          { environment }
        );
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setInitError(`Payment system initialization failed: ${errorMessage}`);
      }
    };

    initPaddle();
  }, []);

  const handleSubscribe = async () => {
    if (!paddle) {
      logger.error(
        'SUBSCRIPTION_FORM',
        'Attempted to subscribe but Paddle is not initialized',
        new Error('Paddle not initialized'),
        { userId: logger.maskUserId(userId) }
      );
      return;
    }

    setIsLoading(true);

    try {
      const priceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID;
      
      if (!priceId) {
        throw new Error('Paddle price ID not configured');
      }

      const checkoutData: CheckoutOpenOptions = {
        items: [
          {
            priceId: priceId,
            quantity: 1,
          },
        ],
        customData: {
          user_id: userId,
        },
        settings: {
          successUrl: `${window.location.origin}/onboarding/subscribe?payment=success`,
          allowLogout: false,
        },
      };

      // Add customer info if available
      if (userEmail) {
        checkoutData.customer = {
          email: userEmail,
        };
      }

      paddle.Checkout.open(checkoutData);
    } catch (error) {
      logger.error(
        'SUBSCRIPTION_FORM',
        'Error opening Paddle checkout',
        error instanceof Error ? error : new Error(String(error)),
        { 
          userId: logger.maskUserId(userId),
          priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID 
        }
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <CardContent className="space-y-6">
        {/* Plan Details */}
        <div className="rounded-lg border p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold">Professional Plan</h3>
              <p className="text-muted-foreground">Perfect for real estate professionals</p>
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
          <h4 className="font-medium mb-2">What happens next:</h4>
          <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
            <li>Complete your subscription payment</li>
            <li>Your AI assistant will be activated immediately</li>
            <li>You'll receive setup instructions via email</li>
            <li>Start receiving intelligent call handling right away</li>
          </ol>
        </div>

        {/* Error Message */}
        {initError && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-red-800">
                  Subscription Unavailable
                </h4>
                <p className="text-sm text-red-700 mt-1">
                  {initError}
                </p>
                <p className="text-sm text-red-600 mt-2">
                  Please refresh the page to try again. If the problem persists, contact support.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Customer Info */}
        {userEmail && (
          <div className="text-sm text-muted-foreground">
            <p><strong>Account:</strong> {userEmail}</p>
            {userName && <p><strong>Name:</strong> {userName}</p>}
            {businessName && <p><strong>Business:</strong> {businessName}</p>}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button variant="outline" asChild>
          <Link href="/onboarding/assistant">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Link>
        </Button>
        
        <Button 
          onClick={handleSubscribe} 
          disabled={!paddle || isLoading || !!initError}
          className={initError ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"}
          title={initError ? "Payment system unavailable" : undefined}
        >
          {initError ? (
            'Payment System Unavailable'
          ) : isLoading ? (
            'Opening Checkout...'
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Subscribe Now
            </>
          )}
        </Button>
      </CardFooter>
    </>
  );
} 