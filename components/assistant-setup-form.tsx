'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { createAssistantAction } from '@/lib/actions/onboarding';
import Link from 'next/link';

interface AssistantSetupFormProps {
  initialData: {
    businessName: string;
    assistantName: string;
    greeting: string;
  };
}

type FormState = {
  errors: {
    assistantName?: string[];
    businessName?: string[];
    greeting?: string[];
    _form?: string[];
  };
  success?: boolean;
};

export function AssistantSetupForm({ initialData }: AssistantSetupFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createAssistantAction, {
    errors: {},
  } as FormState);

  // Handle successful form submission
  useEffect(() => {
    if (state?.success) {
      router.push('/onboarding/subscribe');
    }
  }, [state?.success, router]);

  return (
    <form action={formAction}>
      <CardContent className="space-y-4">
        {state.errors && '_form' in state.errors && state.errors._form && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-800">
              {state.errors._form.join(', ')}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="assistantName">AI Assistant Name *</Label>
          <Input
            id="assistantName"
            name="assistantName"
            placeholder="Enter a name for your AI assistant"
            defaultValue={initialData.assistantName}
            required
            disabled={isPending}
          />
          {state.errors && 'assistantName' in state.errors && state.errors.assistantName && (
            <p className="text-sm text-red-600">{state.errors.assistantName[0]}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Choose a friendly, professional name your callers will recognize.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="businessName">Business Name *</Label>
          <Input
            id="businessName"
            name="businessName"
            placeholder="Enter your business name"
            defaultValue={initialData.businessName}
            required
            disabled={isPending}
          />
          {state.errors && 'businessName' in state.errors && state.errors.businessName && (
            <p className="text-sm text-red-600">{state.errors.businessName[0]}</p>
          )}
          <p className="text-xs text-muted-foreground">
            This will be used in your assistant's greeting.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="greeting">Greeting Message *</Label>
          <Textarea
            id="greeting"
            name="greeting"
            placeholder="Enter the greeting your AI will use"
            defaultValue={initialData.greeting}
            rows={4}
            required
            disabled={isPending}
          />
          {state.errors && 'greeting' in state.errors && state.errors.greeting && (
            <p className="text-sm text-red-600">{state.errors.greeting[0]}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Use [Business Name] and [Assistant Name] as placeholders - they'll be automatically replaced.
          </p>
        </div>

        <div className="rounded-md bg-blue-50 p-4">
          <h4 className="font-medium text-blue-900 mb-2">Preview</h4>
          <p className="text-sm text-blue-800">
            {initialData.greeting
              .replace(/\[Business Name\]/g, initialData.businessName || '[Business Name]')
              .replace(/\[Assistant Name\]/g, initialData.assistantName || '[Assistant Name]')}
          </p>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button variant="outline" asChild disabled={isPending}>
          <Link href="/onboarding/profile">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Link>
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : 'Continue'} 
          {!isPending && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </CardFooter>
    </form>
  );
} 