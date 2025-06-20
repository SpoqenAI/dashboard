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
    logger.error(
      'ONBOARDING_ASSISTANT',
      'Error fetching profile data',
      profileError instanceof Error ? profileError : new Error(String(profileError)),
      { userId: logger.maskUserId(user.id) }
    );
  }

  // Check if assistant already exists
  const { data: assistant, error: assistantError } = await supabase
    .from('assistants')
    .select('assistant_name, business_name, greeting')
    .eq('user_id', user.id)
    .single();

  if (assistantError) {
    logger.error(
      'ONBOARDING_ASSISTANT',
      'Error fetching assistant data',
      assistantError instanceof Error ? assistantError : new Error(String(assistantError)),
      { userId: logger.maskUserId(user.id) }
    );
  }

  return { profile, assistant };
}

export default async function AssistantSetupPage() {
  const { profile, assistant } = await getUserData();

  return (
    <div className="w-full max-w-2xl mx-auto">
      <OnboardingStepper currentStep="assistant" />
      
      <Card>
        <CardHeader>
          <CardTitle>Customize Your AI Assistant</CardTitle>
          <CardDescription>
            Let's personalize how your AI receptionist interacts with callers. You can always change these settings later.
          </CardDescription>
        </CardHeader>
        
        <AssistantSetupForm 
          initialData={{
            businessName: assistant?.business_name || profile?.business_name || '',
            assistantName: assistant?.assistant_name || 'Sarah',
            greeting: assistant?.greeting || `Hi, thanks for calling [Business Name]! I'm [Assistant Name], the AI assistant. How can I help you today?`
          }} 
        />
      </Card>
    </div>
  );
} 