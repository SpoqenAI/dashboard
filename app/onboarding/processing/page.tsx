'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PhoneCall, CheckCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { OnboardingStepper } from '@/components/onboarding-stepper';

// Configuration for processing behavior - optimized for faster redirects
const PROCESSING_CONFIG = {
  maxAttempts: 30, // Reduced from 60 since we create active subscriptions immediately
  pollingIntervalMs: 500, // Faster polling for better UX
  timeoutMs: 30000, // Reduced timeout since subscriptions are created as active
  instantPollingDelayMs: 200, // Much faster initial check
  standardPollingDelayMs: 500, // Faster standard polling
  successDelayMs: 800, // Shorter success delay
  errorDelayMs: 2000,
  retryDelayMs: 1500, // Faster retry
  timeoutWarningMs: 2000,
  finalRedirectDelayMs: 3000, // Shorter final delay
} as const;

export default function ProcessingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stage, setStage] = useState<
    'icon' | 'text' | 'processing' | 'complete'
  >('icon');
  const [statusMessage, setStatusMessage] = useState(
    'Setting up your Spoqen account...'
  );
  const [isInstant, setIsInstant] = useState(false);

  // Create Supabase client once at component level to avoid recreation
  const supabase = createClient();

  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;

    async function handlePaymentSuccess() {
      if (signal.aborted) return;

      const instant = searchParams.get('instant') === 'true';
      setIsInstant(instant);

      if (instant) {
        // Instant flow - payment was immediately processed
        setStatusMessage('Payment confirmed! Setting up your account...');
        await delay(PROCESSING_CONFIG.instantPollingDelayMs, signal); // 200ms
        if (signal.aborted) return;
        setStage('text');
        
        await delay(PROCESSING_CONFIG.instantPollingDelayMs, signal); // 200ms  
        if (signal.aborted) return;
        setStage('processing');
        
        // Check immediately for active subscription, then start polling
        const immediateCheck = await checkSubscription(signal);
        if (signal.aborted) return;
        
        if (immediateCheck?.status === 'active') {
          // Immediate success - redirect right away
          setStage('complete');
          setStatusMessage('Account setup complete! Welcome to Spoqen!');
          await delay(PROCESSING_CONFIG.successDelayMs / 2, signal); // 400ms
          if (!signal.aborted) {
            router.push('/dashboard?welcome=true');
          }
          return;
        }
        
        // If not immediately active, start polling
        await delay(PROCESSING_CONFIG.instantPollingDelayMs, signal);
        if (signal.aborted) return;
        await pollForSubscription(signal);
      } else {
        // Standard flow - waiting for webhook
        await delay(500, signal);
        if (signal.aborted) return;
        setStage('text');
        
        await delay(1500, signal);
        if (signal.aborted) return;
        setStage('processing');
        
        // Start polling for subscription after initial animations
        await delay(PROCESSING_CONFIG.standardPollingDelayMs, signal);
        if (signal.aborted) return;
        await pollForSubscription(signal);
      }
    }

    async function pollForSubscription(signal: AbortSignal) {
      let attempts = 0;
      
      while (attempts < PROCESSING_CONFIG.maxAttempts && !signal.aborted) {
        try {
          const subscription = await checkSubscription(signal);
          if (signal.aborted) return;
          
          if (subscription) {
            if (subscription.status === 'active') {
              // Success! Active subscription found
              setStage('complete');
              setStatusMessage('Account setup complete! Welcome to Spoqen!');

              // Small delay to show success message, then redirect to dashboard
              await delay(PROCESSING_CONFIG.successDelayMs, signal);
              if (signal.aborted) return;
              
              router.push('/dashboard?welcome=true');
              return;
            } else if (subscription.status === 'pending_webhook') {
              // Pending subscription found - show positive progress
              updateProgressMessage(attempts);
            }
          }

          // Continue polling if subscription not found yet
          attempts++;
          if (attempts >= PROCESSING_CONFIG.maxAttempts) {
            // Timeout - show helpful message and provide retry option
            setStatusMessage(
              'Setup is taking longer than expected. This sometimes happens with payment processing.'
            );
            
            await delay(PROCESSING_CONFIG.timeoutWarningMs, signal);
            if (signal.aborted) return;
            
            setStage('complete');
            setStatusMessage(
              'Please check your dashboard or contact support if you continue to experience issues.'
            );
            
            // Give user more time before final redirect
            await delay(PROCESSING_CONFIG.finalRedirectDelayMs, signal);
            if (signal.aborted) return;
            
            router.push('/dashboard');
            return;
          }

          // Update message based on time elapsed
          updateProgressMessage(attempts);

          // Poll again after interval
          await delay(PROCESSING_CONFIG.pollingIntervalMs, signal);
        } catch (error) {
          if (signal.aborted) return;
          
          logger.error(
            'PAYMENT_PROCESSING',
            'Error checking subscription during payment processing',
            error instanceof Error ? error : new Error(String(error)),
            { attempts, maxAttempts: PROCESSING_CONFIG.maxAttempts }
          );
          setStatusMessage('Connection issue. Retrying...');

          // Retry after a longer delay
          await delay(PROCESSING_CONFIG.retryDelayMs, signal);
        }
      }
    }

    async function checkSubscription(signal: AbortSignal) {
      if (signal.aborted) return null;

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        if (signal.aborted) return null;
        setStatusMessage('Authentication error. Redirecting to login...');
        await delay(PROCESSING_CONFIG.errorDelayMs, signal);
        if (!signal.aborted) {
          router.push('/login');
        }
        return null;
      }

      // Check for any subscription (prioritize active status)
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .in('status', ['active', 'pending_webhook'])
        .order('created_at', { ascending: false }) // Get most recent first
        .maybeSingle();

      if (error) {
        throw error;
      }

      return subscription;
    }

    function updateProgressMessage(attempts: number) {
      if (attempts > 20) {
        setStatusMessage('Still setting up your account... almost ready');
      } else if (attempts > 10) {
        setStatusMessage('Almost ready... finalizing your account setup');
      } else if (attempts > 5) {
        setStatusMessage('Configuring your AI assistant...');
      } else if (attempts > 2) {
        setStatusMessage('Finalizing your account setup...');
      } else {
        setStatusMessage('Payment confirmed! Setting up your account...');
      }
    }

    // Helper function for abortable delays
    async function delay(ms: number, signal: AbortSignal): Promise<void> {
      return new Promise((resolve) => {
        if (signal.aborted) {
          resolve();
          return;
        }
        
        const timeout = setTimeout(resolve, ms);
        
        const abortHandler = () => {
          clearTimeout(timeout);
          resolve();
        };
        
        signal.addEventListener('abort', abortHandler, { once: true });
      });
    }

    // Only start processing if we have the payment success indicator
    if (searchParams.get('payment') === 'success') {
      handlePaymentSuccess().catch((error) => {
        if (!abortController.signal.aborted) {
          logger.error(
            'PAYMENT_PROCESSING',
            'Unexpected error in payment processing flow',
            error instanceof Error ? error : new Error(String(error))
          );
          setStatusMessage('An unexpected error occurred. Redirecting...');
          setTimeout(() => {
            if (!abortController.signal.aborted) {
              router.push('/onboarding/subscribe');
            }
          }, PROCESSING_CONFIG.errorDelayMs);
        }
      });
    } else {
      // If no payment success indicator, redirect back to subscribe
      router.push('/onboarding/subscribe');
    }

    return () => {
      abortController.abort();
    };
  }, [router, searchParams, supabase]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Onboarding Stepper */}
      <div className="container py-8">
        <OnboardingStepper currentStep="subscribe" />
      </div>
      
      {/* Processing Content */}
      <div className="flex flex-1 items-center justify-center p-4">
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
                {isInstant 
                  ? 'Your payment was processed instantly!' 
                  : 'This usually takes just a few seconds'
                }
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
    </div>
  );
} 