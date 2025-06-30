'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { OnboardingStepper } from '@/components/onboarding-stepper';
import { SubscriptionForm } from '@/components/subscription-form';

import { createClient } from '@/lib/supabase/client';

// Define specific interfaces for the profile data structure
interface UserProfile {
  business_name: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface UserData {
  user: User;
  profile: UserProfile | null;
  userEmail: string;
}

function SubscribePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    // Check if we're returning from a successful payment
    const paymentSuccess = searchParams.get('payment') === 'success';
    if (paymentSuccess) {
      // Redirect to dedicated processing page
      router.push('/onboarding/processing?payment=success');
    }
  }, [searchParams, router]);

  useEffect(() => {
    let isMounted = true;

    async function getUserData() {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!isMounted) return; // Early return if component unmounted

      if (authError || !user) {
        router.push('/login');
        return;
      }

      // Get profile data for user details
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_name, first_name, last_name')
        .eq('id', user.id)
        .single();

      // Only update state if component is still mounted
      if (isMounted) {
        setUserData({
          user,
          profile,
          userEmail: user.email || '',
        });
      }
    }

    getUserData();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [router]);

  // Show loading while fetching user data
  if (!userData) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <OnboardingStepper currentStep="subscribe" />
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Setup</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <OnboardingStepper currentStep="subscribe" />

      <Card>
        <CardHeader>
          <CardTitle>Complete Your Setup</CardTitle>
          <CardDescription>
            You're almost ready! Subscribe to start receiving calls through your
            AI assistant.
          </CardDescription>
        </CardHeader>

        <SubscriptionForm
          userEmail={userData.userEmail}
          userId={userData.user.id}
          businessName={userData.profile?.business_name || ''}
          userName={
            userData.profile
              ? `${userData.profile.first_name} ${userData.profile.last_name}`.trim()
              : ''
          }
        />
      </Card>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-2xl">
          <OnboardingStepper currentStep="subscribe" />
          <Card>
            <CardHeader>
              <CardTitle>Complete Your Setup</CardTitle>
              <CardDescription>Loading...</CardDescription>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <SubscribePageContent />
    </Suspense>
  );
}
