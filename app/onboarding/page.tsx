import { redirect } from 'next/navigation';

export default function OnboardingPage() {
  // Onboarding is deprecated; always redirect to dashboard
  redirect('/dashboard');
}
