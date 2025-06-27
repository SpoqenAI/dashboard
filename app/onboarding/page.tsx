import { redirect } from 'next/navigation';

export default function OnboardingPage() {
  // Redirect to the new onboarding flow
  redirect('/onboarding/profile');
}
