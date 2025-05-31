'use client';

import type React from 'react';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneCall, ArrowLeft } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { toast } from '@/components/ui/use-toast';
import PasswordStrengthBar from 'react-password-strength-bar';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [score, setScore] = useState(0);

  // Validate recovery session on component mount
  useEffect(() => {
    const validateSession = async () => {
      try {
        const supabase = getSupabaseClient();

        // Get the current session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error.message);
          setIsValidSession(false);
          return;
        }

        // Check if user has a valid session and it's a recovery session
        if (!session || !session.user) {
          setIsValidSession(false);
          return;
        }

        // Additional check: verify the session is fresh (within last 5 minutes)
        // This ensures the user came from a valid password reset email
        const sessionAge =
          Date.now() - new Date(session.user.last_sign_in_at || '').getTime();
        const fiveMinutes = 5 * 60 * 1000;

        if (sessionAge > fiveMinutes) {
          setIsValidSession(false);
          return;
        }

        setIsValidSession(true);
      } catch (error) {
        console.error('Error validating session:', error);
        setIsValidSession(false);
      }
    };

    validateSession();
  }, []);

  // Handle invalid session by redirecting
  useEffect(() => {
    if (isValidSession === false) {
      toast({
        title: 'Invalid reset session',
        description:
          'Your password reset session has expired. Please request a new one.',
        variant: 'destructive',
      });

      // Redirect to forgot password page after a short delay
      setTimeout(() => {
        router.push('/forgot-password');
      }, 2000);
    }
  }, [isValidSession, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.password || !formData.confirmPassword) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in both password fields.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: 'Please make sure your passwords match.',
        variant: 'destructive',
      });
      return;
    }

    // Updated password validation to match signup page requirements
    if (formData.password.length < 8) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 8 characters long.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password.length > 128) {
      toast({
        title: 'Password too long',
        description: 'Please keep password under 128 characters.',
        variant: 'destructive',
      });
      return;
    }

    if (!/[A-Z]/.test(formData.password)) {
      toast({
        title: 'Password requirements not met',
        description: 'Please include at least one uppercase letter.',
        variant: 'destructive',
      });
      return;
    }

    if (!/[a-z]/.test(formData.password)) {
      toast({
        title: 'Password requirements not met',
        description: 'Please include at least one lowercase letter.',
        variant: 'destructive',
      });
      return;
    }

    if (!/[0-9]/.test(formData.password)) {
      toast({
        title: 'Password requirements not met',
        description: 'Please include at least one number.',
        variant: 'destructive',
      });
      return;
    }

    if (!/[!@#$%^&*(),.?":{}|<>\[\]\\/\-_+=~`';]/.test(formData.password)) {
      toast({
        title: 'Password requirements not met',
        description: 'Please include at least one special character (!@#$%^&* etc.).',
        variant: 'destructive',
      });
      return;
    }

    if (score < 2) {
      toast({
        title: 'Password too weak',
        description: 'Please create a stronger password.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const supabase = getSupabaseClient();

      const { error } = await supabase.auth.updateUser({
        password: formData.password,
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Password updated',
        description: 'Your password has been successfully updated.',
      });

      // Redirect to dashboard after successful password reset
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Error updating password',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while validating session
  if (isValidSession === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="mt-2 text-sm text-muted-foreground">
            Validating session...
          </p>
        </div>
      </div>
    );
  }

  // Show error state for invalid session
  if (isValidSession === false) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between">
            <div className="flex items-center gap-2 text-xl font-bold">
              <PhoneCall className="h-5 w-5 text-primary" />
              <Link href="/">Spoqen</Link>
            </div>
            <nav className="flex items-center gap-4">
              <Link href="/login" className="text-sm font-medium">
                Back to Login
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Session Expired</CardTitle>
              <CardDescription>
                Your password reset session has expired or is invalid.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-center">
                <p className="text-sm text-muted-foreground">
                  For security reasons, password reset links expire after a
                  short time.
                </p>
                <p className="text-sm text-muted-foreground">
                  You'll be redirected to request a new reset link.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" asChild className="w-full">
                <Link href="/forgot-password">Request New Reset Link</Link>
              </Button>
            </CardFooter>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 text-xl font-bold">
            <PhoneCall className="h-5 w-5 text-primary" />
            <Link href="/">Spoqen</Link>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium">
              Back to Login
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Reset your password</CardTitle>
              <CardDescription>Enter your new password below</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  aria-invalid={false}
                  maxLength={128}
                />
                <PasswordStrengthBar
                  password={formData.password}
                  minLength={8}
                  scoreWords={[
                    'Too weak',
                    'Weak',
                    'Okay',
                    'Strong',
                    'Very strong',
                  ]}
                  onChangeScore={setScore}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your new password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  aria-invalid={false}
                  maxLength={128}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                className="w-full" 
                type="submit" 
                disabled={
                  isLoading ||
                  !formData.password.trim() ||
                  !formData.confirmPassword.trim() ||
                  formData.password.length < 8 ||
                  score < 2
                }
              >
                {isLoading ? 'Updating Password...' : 'Update Password'}
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link href="/login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Link>
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
