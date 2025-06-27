'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { OnboardingStepper } from '@/components/onboarding-stepper';
import { ProfileSetupForm } from '@/components/profile-setup-form';
import { createClient } from '@/lib/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { logger } from '@/lib/logger';

export default function ProfileSetupPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const error = searchParams.get('error');

  useEffect(() => {
    async function getProfile() {
      try {
        const supabase = createClient();

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.push('/login');
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('first_name, last_name, business_name, phone, brokerage')
          .eq('id', user.id)
          .single();

        if (profileError) {
          // Only log actual errors, not "no rows found" type responses
          if (profileError.code !== 'PGRST116') {
            logger.error(
              'ONBOARDING_PROFILE',
              'Error fetching profile data',
              profileError instanceof Error
                ? profileError
                : new Error(JSON.stringify(profileError)),
              {
                userId: logger.maskUserId(user.id),
                errorCode: profileError.code,
                errorMessage: profileError.message,
              }
            );
          }
          // Set empty profile to allow form to render with empty fields
          setProfile(null);
        } else {
          setProfile(profileData);
        }
      } catch (error) {
        logger.error(
          'ONBOARDING_PROFILE',
          'Unexpected error loading profile',
          error instanceof Error ? error : new Error(String(error))
        );
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }

    getProfile();
  }, [router]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <OnboardingStepper currentStep="profile" />
        <Card>
          <CardHeader>
            <CardTitle>Welcome to Spoqen!</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <OnboardingStepper currentStep="profile" />

      {error === 'subscription-timeout' && (
        <Alert className="mb-4 border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <div className="space-y-3">
              <p className="font-medium">
                Payment Successful - Account Setup in Progress
              </p>
              <p>
                Your payment was processed successfully! We're finalizing your
                account setup, which can take a few minutes. You'll receive a
                confirmation email once complete.
              </p>
              <p className="text-sm">
                You can continue using the platform while we finish the setup,
                or contact support if you have any questions.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/check-subscription');
                      const data = await response.json();
                      if (data.hasActiveSubscription) {
                        window.location.href = '/dashboard?welcome=true';
                      } else {
                        alert(
                          'Subscription is still being processed. Please wait a few more minutes.'
                        );
                      }
                    } catch (error) {
                      alert('Unable to check status. Please try again later.');
                    }
                  }}
                  className="rounded bg-orange-100 px-3 py-1 text-sm text-orange-800 transition-colors hover:bg-orange-200"
                >
                  Check Status
                </button>
                <a
                  href="/contact"
                  className="rounded border border-orange-300 bg-white px-3 py-1 text-sm text-orange-800 transition-colors hover:bg-gray-50"
                >
                  Contact Support
                </a>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Welcome to Spoqen!</CardTitle>
          <CardDescription>
            Let's start by setting up your profile. This information will help
            us personalize your AI assistant.
          </CardDescription>
        </CardHeader>

        <ProfileSetupForm initialData={profile} />
      </Card>
    </div>
  );
}
