'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { ArrowLeft, Check, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { initializePaddle, Paddle } from '@paddle/paddle-js';

interface SubscriptionFormProps {
  userEmail: string;
  userName: string;
  businessName: string;
  userId: string;
}

export function SubscriptionForm({ userEmail, userName, businessName, userId }: SubscriptionFormProps) {
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const initPaddle = async () => {
      try {
        const paddleInstance = await initializePaddle({
          environment: process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT as 'sandbox' | 'production' || 'sandbox',
          token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
        });
        if (paddleInstance) {
          setPaddle(paddleInstance);
        }
      } catch (error) {
        console.error('Failed to initialize Paddle:', error);
      }
    };

    initPaddle();
  }, []);

  const handleSubscribe = async () => {
    if (!paddle) {
      console.error('Paddle not initialized');
      return;
    }

    setIsLoading(true);

    try {
      const priceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID;
      
      if (!priceId) {
        throw new Error('Paddle price ID not configured');
      }

      const checkoutData: any = {
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
      if (userEmail && userName) {
        checkoutData.customer = {
          email: userEmail,
          name: userName,
        };
      }

      paddle.Checkout.open(checkoutData);
    } catch (error) {
      console.error('Error opening checkout:', error);
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
          disabled={!paddle || isLoading}
          className="bg-green-600 hover:bg-green-700"
        >
          {isLoading ? (
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