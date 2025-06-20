'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PhoneCall, CheckCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

export function PaymentProcessing() {
  const router = useRouter();
  const [stage, setStage] = useState<'icon' | 'text' | 'processing' | 'complete'>('icon');
  const [statusMessage, setStatusMessage] = useState('Setting up your Spoqen account...');

  useEffect(() => {
    let mounted = true;
    const timeoutIds: NodeJS.Timeout[] = [];
    const supabase = createClient(); // Create client once and reuse

    async function handlePaymentSuccess() {
      // Initial animation sequence
      timeoutIds.push(setTimeout(() => mounted && setStage('text'), 500));
      timeoutIds.push(setTimeout(() => mounted && setStage('processing'), 1500));

      // Start polling for subscription after initial animations
      timeoutIds.push(setTimeout(() => {
        if (mounted) {
          pollForSubscription();
        }
      }, 2000));
    }

    async function pollForSubscription() {
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max wait

      const checkSubscription = async () => {
        if (!mounted) return;

        try {
          const {
            data: { user },
            error: authError,
          } = await supabase.auth.getUser();

          if (authError || !user) {
            setStatusMessage('Authentication error. Redirecting to login...');
            timeoutIds.push(setTimeout(() => router.push('/login'), 2000));
            return;
          }

          // Check for active subscription
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select('status')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .maybeSingle();

          if (subscription) {
            // Success! Subscription found
            setStage('complete');
            setStatusMessage('Account setup complete! Welcome to Spoqen!');
            
            // Small delay to show success message, then redirect to dashboard
            timeoutIds.push(setTimeout(() => {
              if (mounted) {
                router.push('/dashboard?welcome=true');
              }
            }, 1500));
            return;
          }

          // Continue polling if subscription not found yet
          attempts++;
          if (attempts >= maxAttempts) {
            // Timeout - redirect with helpful message
            setStatusMessage('Setup is taking longer than expected. Redirecting...');
            timeoutIds.push(setTimeout(() => {
              if (mounted) {
                router.push('/dashboard?setup=pending');
              }
            }, 2000));
            return;
          }

          // Update message based on time elapsed
          if (attempts > 10) {
            setStatusMessage('Almost ready... finalizing your account setup');
          } else if (attempts > 5) {
            setStatusMessage('Configuring your AI assistant...');
          }

          // Poll again in 1 second
          timeoutIds.push(setTimeout(checkSubscription, 1000));

        } catch (error) {
          logger.error(
            'PAYMENT_PROCESSING',
            'Error checking subscription during payment processing',
            error instanceof Error ? error : new Error(String(error)),
            { attempts, maxAttempts }
          );
          setStatusMessage('Connection issue. Please check your internet...');
          
          // Retry after a longer delay
          timeoutIds.push(setTimeout(checkSubscription, 3000));
        }
      };

      checkSubscription();
    }

    handlePaymentSuccess();

    return () => {
      mounted = false;
      // Clear all timeouts to prevent memory leaks
      timeoutIds.forEach(clearTimeout);
    };
  }, [router]);

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
      <div className="text-center space-y-8 max-w-md mx-auto px-6">
        
        {/* Spoqen Logo */}
        <div className="flex items-center justify-center gap-3 text-2xl font-bold text-primary mb-12">
          <PhoneCall className="h-8 w-8" />
          <span>Spoqen</span>
        </div>

        {/* Success Icon with Animation */}
        <div className={`transition-all duration-500 ${stage === 'icon' ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}>
          <CheckCircle className={`h-20 w-20 mx-auto mb-6 transition-colors duration-500 ${
            stage === 'complete' ? 'text-green-500' : 'text-green-400'
          }`} />
        </div>

        {/* Text Content */}
        <div className={`space-y-4 transition-all duration-500 delay-300 ${stage === 'text' || stage === 'processing' || stage === 'complete' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h1 className={`text-3xl font-bold transition-colors duration-500 ${
            stage === 'complete' ? 'text-green-600' : 'text-gray-900'
          }`}>
            {stage === 'complete' ? 'Welcome to Spoqen!' : 'Payment Successful!'}
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
        <div className={`transition-all duration-500 delay-500 ${stage === 'processing' ? 'opacity-100' : 'opacity-0'}`}>
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