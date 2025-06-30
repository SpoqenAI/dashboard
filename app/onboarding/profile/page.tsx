import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { OnboardingStepper } from '@/components/onboarding-stepper';
import { ProfileSetupForm } from '@/components/profile-setup-form';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { logger } from '@/lib/logger';

async function getProfile() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(
      'first_name, last_name, business_name, phone, brokerage, city, state'
    )
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
    // Return null/empty profile to allow form to render with empty fields
    return null;
  }

  return profile;
}

interface ProfileSetupPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function ProfileSetupPage({
  searchParams,
}: ProfileSetupPageProps) {
  const profile = await getProfile();
  const resolvedSearchParams = await searchParams;
  const error = resolvedSearchParams.error;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <OnboardingStepper currentStep="profile" />

      {error === 'subscription-timeout' && (
        <Alert className="mb-4 border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            Your payment is still being processed. Please check your email for
            confirmation, or contact support if you need assistance.
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
