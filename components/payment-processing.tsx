'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PhoneCall, CheckCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import useSWR from 'swr';

export function PaymentProcessing() {
  const router = useRouter();
  const [stage, setStage] = useState<
    'icon' | 'text' | 'processing' | 'complete'
  >('icon');
  const [statusMessage, setStatusMessage] = useState(
    'Setting up your Spoqen account...'
  );

  // Create Supabase client once at component level to avoid recreation
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;
    const timeoutIds: NodeJS.Timeout[] = [];

    async function handlePaymentSuccess() {
      // Initial animation sequence
      timeoutIds.push(setTimeout(() => mounted && setStage('text'), 500));
      timeoutIds.push(
        setTimeout(() => mounted && setStage('processing'), 1500)
      );
    }

    handlePaymentSuccess();

    return () => {
      mounted = false;
      // Clear all timeouts to prevent memory leaks
      timeoutIds.forEach(clearTimeout);
    };
  }, [router]);

  // SWR polling for subscription status (pauses when hidden) -----------------
  const attemptsRef = useRef(0);
  const maxAttempts = 30; // ~30 seconds at 1s interval

  const { data: activeSubscription, error: subscriptionError } = useSWR(
    stage === 'processing' ? 'payment_processing_subscription' : null,
    async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('AUTH_ERROR');
      }

      const { data } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      return data;
    },
    {
      refreshInterval: 1000,
      refreshWhenHidden: false,
      onSuccess: () => {
        attemptsRef.current += 1;
      },
      onError: () => {
        attemptsRef.current += 1;
      },
    }
  );

  // React to subscription status / attempts
  useEffect(() => {
    if (activeSubscription && stage !== 'complete') {
      setStage('complete');
      setStatusMessage('Account setup complete! Welcome to Spoqen!');

      const id = setTimeout(() => {
        router.push('/dashboard?welcome=true');
      }, 1500);

      return () => clearTimeout(id);
    }

    // Handle authentication issues
    if (subscriptionError?.message === 'AUTH_ERROR') {
      setStatusMessage('Authentication error. Redirecting to login...');
      const id = setTimeout(() => router.push('/login'), 2000);
      return () => clearTimeout(id);
    }

    // Update status messages dynamically
    if (stage === 'processing') {
      if (attemptsRef.current >= maxAttempts) {
        setStatusMessage(
          'Setup is taking longer than expected. Redirecting...'
        );
        const id = setTimeout(
          () => router.push('/dashboard?setup=pending'),
          2000
        );
        return () => clearTimeout(id);
      } else if (attemptsRef.current > 10) {
        setStatusMessage('Almost ready... finalizing your account setup');
      } else if (attemptsRef.current > 5) {
        setStatusMessage('Configuring your AI assistant...');
      }
    }
  }, [activeSubscription, subscriptionError, stage, router]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="mx-auto max-w-md space-y-8 px-6 text-center">
        {/* Spoqen Logo */}
        <div className="mb-12 flex items-center justify-center gap-3 text-2xl font-bold text-primary">
          <PhoneCall className="h-8 w-8" />
          <span>Spoqen</span>
        </div>

        {/* Success Icon with Animation */}
        <div
          className={`transition-all duration-500 ${stage === 'icon' ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
        >
          <CheckCircle
            className={`mx-auto mb-6 h-20 w-20 transition-colors duration-500 ${
              stage === 'complete' ? 'text-green-500' : 'text-green-400'
            }`}
          />
        </div>

        {/* Text Content */}
        <div
          className={`space-y-4 transition-all delay-300 duration-500 ${stage === 'text' || stage === 'processing' || stage === 'complete' ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
        >
          <h1
            className={`text-3xl font-bold transition-colors duration-500 ${
              stage === 'complete' ? 'text-green-600' : 'text-gray-900'
            }`}
          >
            {stage === 'complete'
              ? 'Welcome to Spoqen!'
              : 'Payment Successful!'}
          </h1>
          <p className="text-lg text-gray-600 transition-all duration-500">
            {statusMessage}
          </p>
          {stage !== 'complete' && (
            <p className="text-sm text-gray-500">
              This will only take a moment
            </p>
          )}
        </div>

        {/* Loading Animation */}
        <div
          className={`transition-all delay-500 duration-500 ${stage === 'processing' ? 'opacity-100' : 'opacity-0'}`}
        >
          <div className="flex items-center justify-center gap-2 text-primary">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">Processing...</span>
          </div>
        </div>

        {/* Success Checkmark for completion */}
        {stage === 'complete' && (
          <div className="animate-pulse">
            <div className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Ready to go!</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
