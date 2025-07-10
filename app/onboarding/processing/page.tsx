'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  PhoneCall,
  CheckCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { analytics, performance } from '@/lib/analytics';
import { OnboardingStepper } from '@/components/onboarding-stepper';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Configuration for processing behavior - optimized for faster redirects
const PROCESSING_CONFIG = {
  maxAttempts: 15, // Reduced since we create active subscriptions immediately
  pollingIntervalMs: 300, // Even faster polling for better UX
  timeoutMs: 15000, // Reduced timeout since subscriptions are created as active
  instantPollingDelayMs: 100, // Immediate initial check
  standardPollingDelayMs: 300, // Faster standard polling
  successDelayMs: 600, // Short success delay
  errorDelayMs: 2000,
  retryDelayMs: 1000, // Fast retry
  optimisticTimeoutMs: 5000, // Time to wait before falling back to polling
} as const;

type ProcessingStage =
  | 'initializing'
  | 'checking'
  | 'processing'
  | 'complete'
  | 'error';
type ErrorType =
  | 'subscription_failed'
  | 'auth_error'
  | 'connection_error'
  | 'timeout'
  | 'unknown';

interface ProcessingError {
  type: ErrorType;
  message: string;
  recoveryAction: string;
  canRetry: boolean;
}

function ProcessingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stage, setStage] = useState<ProcessingStage>('initializing');
  const [statusMessage, setStatusMessage] = useState(
    'Setting up your Spoqen account...'
  );
  const [error, setError] = useState<ProcessingError | null>(null);
  const [isInstant, setIsInstant] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isOptimistic, setIsOptimistic] = useState(true);

  // Create Supabase client once at component level to avoid recreation
  const supabase = createClient();

  // Error mapping with recovery actions
  const getErrorDetails = useCallback((errorType: string): ProcessingError => {
    switch (errorType) {
      case 'subscription_failed':
        return {
          type: 'subscription_failed',
          message: 'Subscription creation failed',
          recoveryAction:
            'Please try subscribing again or contact support if the issue persists.',
          canRetry: true,
        };
      case 'auth_error':
        return {
          type: 'auth_error',
          message: 'Authentication error',
          recoveryAction: 'Please log in again to continue.',
          canRetry: false,
        };
      case 'connection_error':
        return {
          type: 'connection_error',
          message: 'Connection issue',
          recoveryAction: 'Check your internet connection and try again.',
          canRetry: true,
        };
      case 'timeout':
        return {
          type: 'timeout',
          message: 'Setup is taking longer than expected',
          recoveryAction:
            'Your payment was processed. Please check your dashboard or try refreshing.',
          canRetry: true,
        };
      default:
        return {
          type: 'unknown',
          message: 'An unexpected error occurred',
          recoveryAction:
            'Please try again or contact support if the problem continues.',
          canRetry: true,
        };
    }
  }, []);

  // Optimistic success - redirect immediately and handle errors if they occur
  const handleOptimisticSuccess = useCallback(async () => {
    logger.info('PAYMENT_PROCESSING', 'Starting optimistic redirect flow');

    setStage('complete');
    setStatusMessage('Account setup complete! Welcome to Spoqen!');

    // Track onboarding completion
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const onboardingDuration = 5000; // Approximate duration for optimistic flow
        await analytics.trackOnboardingComplete(user.id, onboardingDuration, {
          isOptimistic: true,
          instant: isInstant,
        });
      }
    } catch (error) {
      logger.warn(
        'PAYMENT_PROCESSING',
        'Failed to track onboarding completion',
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }

    // Short delay to show success message, then redirect
    await new Promise(resolve =>
      setTimeout(resolve, PROCESSING_CONFIG.successDelayMs)
    );

    logger.info('PAYMENT_PROCESSING', 'Redirecting to dashboard (optimistic)');
    router.push('/dashboard?welcome=true&onboarding=complete');
  }, [router, supabase, isInstant]);

  // Fallback verification - check if subscription actually exists
  const verifySubscription = useCallback(async (): Promise<boolean> => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setError(getErrorDetails('auth_error'));
        return false;
      }

      // Check for current subscription (current=true)
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .eq('current', true)
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (error) {
        logger.error(
          'PAYMENT_PROCESSING',
          'Subscription verification failed',
          error
        );
        return false;
      }

      return !!subscription;
    } catch (error) {
      logger.error(
        'PAYMENT_PROCESSING',
        'Error during subscription verification',
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }
  }, [supabase, getErrorDetails]);

  // Retry mechanism
  const handleRetry = useCallback(async () => {
    setError(null);
    setStage('checking');
    setRetryCount(prev => prev + 1);
    setStatusMessage('Retrying... Please wait.');

    const hasSubscription = await verifySubscription();

    if (hasSubscription) {
      await handleOptimisticSuccess();
    } else {
      setError(getErrorDetails('subscription_failed'));
      setStage('error');
    }
  }, [verifySubscription, handleOptimisticSuccess, getErrorDetails]);

  // Recovery actions
  const handleRecoveryAction = useCallback(
    (errorType: ErrorType) => {
      switch (errorType) {
        case 'auth_error':
          router.push('/login?error=session_expired');
          break;
        case 'subscription_failed':
          router.push('/onboarding/subscribe?error=subscription_failed');
          break;
        case 'timeout':
          router.push('/dashboard');
          break;
        default:
          if (retryCount < 3) {
            handleRetry();
          } else {
            router.push('/onboarding/subscribe?error=max_retries');
          }
      }
    },
    [router, retryCount, handleRetry]
  );

  useEffect(() => {
    const abortController = new AbortController();

    async function initializeProcessing() {
      if (abortController.signal.aborted) return;

      const instant = searchParams.get('instant') === 'true';
      const errorParam = searchParams.get('error');

      setIsInstant(instant);

      // Handle error states from success callback
      if (errorParam) {
        setError(getErrorDetails(errorParam));
        setStage('error');
        return;
      }

      if (instant) {
        // Optimistic flow - assume success and redirect immediately
        setStatusMessage('Payment confirmed! Setting up your account...');
        setStage('processing');

        // Start optimistic success flow
        setTimeout(() => {
          if (!abortController.signal.aborted) {
            handleOptimisticSuccess();
          }
        }, PROCESSING_CONFIG.instantPollingDelayMs);

        // Verify in background
        setTimeout(async () => {
          if (!abortController.signal.aborted && isOptimistic) {
            const hasSubscription = await verifySubscription();
            if (!hasSubscription) {
              // Fallback to error state if verification fails
              setIsOptimistic(false);
              setError(getErrorDetails('subscription_failed'));
              setStage('error');
            }
          }
        }, PROCESSING_CONFIG.optimisticTimeoutMs);
      } else {
        // Standard flow - verify subscription before redirecting
        setStage('checking');
        setStatusMessage('Verifying your subscription...');

        const hasSubscription = await verifySubscription();

        if (hasSubscription) {
          await handleOptimisticSuccess();
        } else {
          setError(getErrorDetails('subscription_failed'));
          setStage('error');
        }
      }
    }

    // Only start processing if we have the payment success indicator
    if (searchParams.get('payment') === 'success') {
      initializeProcessing().catch(error => {
        if (!abortController.signal.aborted) {
          logger.error(
            'PAYMENT_PROCESSING',
            'Unexpected error in payment processing flow',
            error instanceof Error ? error : new Error(String(error))
          );
          setError(getErrorDetails('unknown'));
          setStage('error');
        }
      });
    } else {
      // If no payment success indicator, redirect back to subscribe
      router.push('/onboarding/subscribe');
    }

    return () => {
      abortController.abort();
    };
  }, [
    router,
    searchParams,
    supabase,
    getErrorDetails,
    handleOptimisticSuccess,
    verifySubscription,
  ]);

  // Performance monitoring
  useEffect(() => {
    const startTime = Date.now();

    return () => {
      const duration = Date.now() - startTime;
      logger.info('PAYMENT_PROCESSING', 'Processing page performance', {
        duration,
        stage,
        isInstant,
        retryCount,
        hasError: !!error,
      });
    };
  }, [stage, isInstant, retryCount, error]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Onboarding Stepper */}
      <div className="container py-8">
        <OnboardingStepper
          currentStep="processing"
          isProcessing={stage === 'processing' || stage === 'checking'}
        />
      </div>

      {/* Processing Content */}
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="mx-auto max-w-md space-y-8 px-6 text-center">
          {/* Spoqen Logo */}
          <div className="mb-12 flex items-center justify-center gap-3 text-2xl font-bold text-primary">
            <PhoneCall className="h-8 w-8" />
            <span>Spoqen</span>
          </div>

          {/* Status Icon */}
          <div className="transition-all duration-500">
            {stage === 'complete' ? (
              <CheckCircle className="mx-auto mb-6 h-20 w-20 text-green-500 duration-500 animate-in zoom-in" />
            ) : stage === 'error' ? (
              <AlertCircle className="mx-auto mb-6 h-20 w-20 text-red-500 duration-500 animate-in zoom-in" />
            ) : (
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="space-y-4">
            <h1
              className={`text-3xl font-bold transition-colors duration-500 ${
                stage === 'complete'
                  ? 'text-green-600'
                  : stage === 'error'
                    ? 'text-red-600'
                    : 'text-gray-900'
              }`}
            >
              {stage === 'complete'
                ? 'Welcome to Spoqen!'
                : stage === 'error'
                  ? 'Setup Issue'
                  : 'Payment Successful!'}
            </h1>

            <p className="text-lg text-gray-600 transition-all duration-500">
              {error ? error.message : statusMessage}
            </p>

            {stage !== 'complete' && stage !== 'error' && (
              <p className="text-sm text-gray-500">
                {isInstant
                  ? 'Your payment was processed instantly!'
                  : 'This usually takes just a few seconds'}
              </p>
            )}

            {/* Error State */}
            {error && (
              <div className="space-y-4 duration-500 animate-in slide-in-from-bottom">
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">
                    {error.recoveryAction}
                  </AlertDescription>
                </Alert>

                <div className="flex flex-col justify-center gap-3 sm:flex-row">
                  {error.canRetry && retryCount < 3 && (
                    <Button
                      onClick={handleRetry}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Try Again
                    </Button>
                  )}

                  <Button
                    onClick={() => handleRecoveryAction(error.type)}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    {error.type === 'auth_error'
                      ? 'Sign In Again'
                      : error.type === 'timeout'
                        ? 'Go to Dashboard'
                        : 'Back to Subscribe'}
                  </Button>
                </div>
              </div>
            )}

            {/* Success State */}
            {stage === 'complete' && (
              <div className="delay-100 duration-500 animate-in zoom-in">
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">Ready to go!</span>
                </div>
              </div>
            )}

            {/* Processing State */}
            {(stage === 'processing' || stage === 'checking') && (
              <div className="flex items-center justify-center gap-2 text-primary">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium">
                  {stage === 'checking' ? 'Verifying...' : 'Processing...'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {stage === 'complete' &&
          'Account setup complete. Redirecting to dashboard.'}
        {stage === 'error' &&
          error &&
          `Error: ${error.message}. ${error.recoveryAction}`}
        {stage === 'processing' && 'Setting up your account. Please wait.'}
      </div>
    </div>
  );
}

export default function ProcessingPage() {
  return (
    <Suspense fallback={null}>
      <ProcessingPageContent />
    </Suspense>
  );
}
