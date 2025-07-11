'use client';

import { useEffect, useState, Suspense, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { setWelcomeCompletedAction } from '@/lib/actions/welcome';
import { createClient } from '@/lib/supabase/client';

// --- Welcome Page Content ---
function WelcomeContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Client-side check: if welcome_completed is already true, redirect to /dashboard
  useEffect(() => {
    let isMounted = true;
    async function checkWelcomeCompleted() {
      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) return; // Not logged in, let middleware handle
      const { data: settings } = await supabase
        .from('user_settings')
        .select('welcome_completed')
        .eq('id', user.id)
        .maybeSingle();
      if (isMounted && settings?.welcome_completed) {
        router.replace('/dashboard');
      }
    }
    checkWelcomeCompleted();
    return () => {
      isMounted = false;
    };
  }, [router]);

  // Handler for both buttons
  const handleComplete = (redirectTo: string) => {
    setLoading(true);
    setError(null);
    startTransition(async () => {
      try {
        const result = await setWelcomeCompletedAction();
        if (result?.error) {
          setError(result.error);
          setLoading(false);
        } else {
          router.replace(redirectTo);
          // Force a reload to ensure UI updates (in case of stale state)
          router.refresh();
        }
      } catch (err: any) {
        setError('Unexpected error. Please try again.');
        setLoading(false);
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-lg py-12">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to Spoqen!</CardTitle>
          <CardDescription>
            {/* Explain free tier features and upgrade path */}
            <ul className="mb-4 list-disc pl-5 text-sm text-muted-foreground">
              <li>Free tier: Receive and transcribe up to 20 calls/month</li>
              <li>
                AI receptionist answers, qualifies, and syncs leads to your CRM
              </li>
              <li>
                Upgrade anytime for unlimited calls, advanced analytics, and
                integrations
              </li>
            </ul>
            <div className="mb-2 text-base font-medium">
              Ready to get started?
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <Button
                variant="default"
                disabled={loading || isPending}
                onClick={() => handleComplete('/dashboard')}
                className="w-full"
              >
                {loading || isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Continue for free
              </Button>
              <Button
                variant="outline"
                disabled={loading || isPending}
                onClick={() => handleComplete('/settings?tab=billing')}
                className="w-full"
              >
                {loading || isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Subscribe now
              </Button>
            </div>
            {error && <div className="mt-4 text-sm text-red-600">{error}</div>}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

// --- Suspense Wrapper ---
export default function WelcomePage() {
  // Suspense for async client-side check/loading
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <WelcomeContent />
    </Suspense>
  );
}
// Comments throughout explain each logic branch and async state.
