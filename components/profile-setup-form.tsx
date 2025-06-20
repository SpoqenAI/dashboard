'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight } from 'lucide-react';
import { updateProfileAction } from '@/lib/actions/onboarding';

interface ProfileSetupFormProps {
  initialData: {
    first_name?: string | null;
    last_name?: string | null;
    business_name?: string | null;
    phone?: string | null;
    brokerage?: string | null;
  } | null;
}

type FormState = {
  errors: {
    firstName?: string[];
    lastName?: string[];
    businessName?: string[];
    phone?: string[];
    brokerage?: string[];
    _form?: string[];
  };
  success?: boolean;
};

export function ProfileSetupForm({ initialData }: ProfileSetupFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updateProfileAction, {
    errors: {},
  } as FormState);

  // Handle successful form submission
  useEffect(() => {
    if (state?.success) {
      router.push('/onboarding/assistant');
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              name="firstName"
              placeholder="Enter your first name"
              defaultValue={initialData?.first_name || ''}
              required
              disabled={isPending}
            />
            {state.errors &&
              'firstName' in state.errors &&
              state.errors.firstName && (
                <p className="text-sm text-red-600">
                  {state.errors.firstName[0]}
                </p>
              )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              name="lastName"
              placeholder="Enter your last name"
              defaultValue={initialData?.last_name || ''}
              required
              disabled={isPending}
            />
            {state.errors &&
              'lastName' in state.errors &&
              state.errors.lastName && (
                <p className="text-sm text-red-600">
                  {state.errors.lastName[0]}
                </p>
              )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="businessName">Business Name *</Label>
          <Input
            id="businessName"
            name="businessName"
            placeholder="Enter your business name"
            defaultValue={initialData?.business_name || ''}
            required
            disabled={isPending}
          />
          {state.errors &&
            'businessName' in state.errors &&
            state.errors.businessName && (
              <p className="text-sm text-red-600">
                {state.errors.businessName[0]}
              </p>
            )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="Enter your phone number"
            defaultValue={initialData?.phone || ''}
            required
            disabled={isPending}
          />
          {state.errors && 'phone' in state.errors && state.errors.phone && (
            <p className="text-sm text-red-600">{state.errors.phone[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="brokerage">Brokerage (Optional)</Label>
          <Input
            id="brokerage"
            name="brokerage"
            placeholder="Enter your brokerage name"
            defaultValue={initialData?.brokerage || ''}
            disabled={isPending}
          />
          {state.errors &&
            'brokerage' in state.errors &&
            state.errors.brokerage && (
              <p className="text-sm text-red-600">
                {state.errors.brokerage[0]}
              </p>
            )}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        <div></div>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : 'Continue'}
          {!isPending && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </CardFooter>
    </form>
  );
}
