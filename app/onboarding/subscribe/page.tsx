'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { OnboardingStepper } from '@/components/onboarding-stepper';
import { SubscriptionForm } from '@/components/subscription-form';
import { PaymentProcessing } from '@/components/payment-processing';
import { createClient } from '@/lib/supabase/client';

function SubscribePageContent() {
  const searchParams = useSearchParams();
  const [showProcessing, setShowProcessing] = useState(false);
  const [userData, setUserData] = useState<{
    user: any;
    profile: any;
    userEmail: string;
  } | null>(null);

  useEffect(() => {
    // Check if we're returning from a successful payment
    const paymentSuccess = searchParams.get('payment') === 'success';
    if (paymentSuccess) {
      setShowProcessing(true);
    }
  }, [searchParams]);

  useEffect(() => {
    async function getUserData() {
      const supabase = createClient();
      
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        window.location.href = '/login';
        return;
      }

      // Get profile data for user details
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_name, first_name, last_name')
        .eq('id', user.id)
        .single();

      setUserData({
        user,
        profile,
        userEmail: user.email || '',
      });
    }

    getUserData();
  }, []);

  // Show payment processing state if returning from successful payment
  if (showProcessing) {
    return <PaymentProcessing />;
  }

  // Show loading while fetching user data
  if (!userData) {
    return (
      <div className="w-full max-w-2xl mx-auto">
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
    <div className="w-full max-w-2xl mx-auto">
      <OnboardingStepper currentStep="subscribe" />
      
      <Card>
        <CardHeader>
          <CardTitle>Complete Your Setup</CardTitle>
          <CardDescription>
            You're almost ready! Subscribe to start receiving calls through your AI assistant.
          </CardDescription>
        </CardHeader>
        
        <SubscriptionForm
          userEmail={userData.userEmail}
          userId={userData.user.id}
          businessName={userData.profile?.business_name || ''}
          userName={userData.profile ? `${userData.profile.first_name} ${userData.profile.last_name}`.trim() : ''}
        />
      </Card>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-2xl mx-auto">
        <OnboardingStepper currentStep="subscribe" />
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Setup</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    }>
      <SubscribePageContent />
    </Suspense>
  );
} 