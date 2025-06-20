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

async function getProfile() {
  const supabase = await createClient();
  
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, business_name, phone, brokerage')
    .eq('id', user.id)
    .single();

  return profile;
}

interface ProfileSetupPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function ProfileSetupPage({ searchParams }: ProfileSetupPageProps) {
  const profile = await getProfile();
  const error = searchParams.error;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <OnboardingStepper currentStep="profile" />
      
      {error === 'subscription-timeout' && (
        <Alert className="mb-4 border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            Your payment is still being processed. Please check your email for confirmation, or contact support if you need assistance.
          </AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Welcome to Spoqen!</CardTitle>
          <CardDescription>
            Let's start by setting up your profile. This information will help us personalize your AI assistant.
          </CardDescription>
        </CardHeader>
        
        <ProfileSetupForm initialData={profile} />
      </Card>
    </div>
  );
} 