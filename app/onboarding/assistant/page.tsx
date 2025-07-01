import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { OnboardingStepper } from '@/components/onboarding-stepper';
import { AssistantSetupForm } from '@/components/assistant-setup-form';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { logger } from '@/lib/logger';

async function getUserData() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Get profile data for pre-filling business name
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('business_name')
    .eq('id', user.id)
    .single();

  if (profileError) {
    // Only log actual errors, not "no rows found" type responses
    if (profileError.code !== 'PGRST116') {
      logger.error(
        'ONBOARDING_ASSISTANT',
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
  }

  return { profile };
}

export default async function AssistantSetupPage() {
  const { profile } = await getUserData();

  return (
    <div className="mx-auto w-full max-w-2xl">
      <OnboardingStepper currentStep="assistant" />

      <Card>
        <CardHeader>
          <CardTitle>Customize Your AI Assistant</CardTitle>
          <CardDescription>
            Let's personalize how your AI receptionist interacts with callers.
            You can always change these settings later.
          </CardDescription>
        </CardHeader>

        <AssistantSetupForm
          initialData={{
            businessName: profile?.business_name || '',
            assistantName: 'Sarah',
            greeting: `Hi, thanks for calling [Business Name]! I'm [Assistant Name], the AI assistant. How can I help you today?`,
          }}
        />
      </Card>
    </div>
  );
}
