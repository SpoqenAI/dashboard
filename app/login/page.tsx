'use client';

import type React from 'react';

import { useState, useEffect, Suspense } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
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
import { signIn } from '@/lib/auth';
import { toast } from '@/components/ui/use-toast';
import { SocialLogin } from '@/components/auth/social-login';
import { resendVerificationEmail } from '@/lib/auth';
import Logo from '@/components/ui/logo';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // Handle OAuth error messages from URL parameters
  useEffect(() => {
    const error = searchParams.get('error');
    const message = searchParams.get('message');
    const errorDescription = searchParams.get('error_description');

    if (error && message) {
      toast({
        title: 'Authentication failed',
        description: decodeURIComponent(message),
        variant: 'destructive',
      });
    } else if (error) {
      let description = 'Authentication failed. Please try again.';

      switch (error) {
        case 'missing_code':
          description = 'Authentication code missing. Please try again.';
          break;
        case 'exchange_failed':
          description = 'Failed to complete authentication. Please try again.';
          break;
        case 'no_session':
          description = 'Unable to create session. Please try again.';
          break;
        case 'access_denied':
          description = 'Access was denied. Please try again.';
          break;
        default:
          if (errorDescription) {
            description = decodeURIComponent(errorDescription);
          }
      }

      toast({
        title: 'Authentication failed',
        description,
        variant: 'destructive',
      });
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast({
        title: 'Missing fields',
        description: 'Please enter both email and password.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await signIn(formData.email, formData.password);

      if (error) {
        throw error;
      }

      toast({
        title: 'Login successful',
        description: 'Welcome back!',
      });

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error: any) {
      let title = 'Login failed';
      let description = 'Invalid email or password. Please try again.';

      // Handle specific error cases - only expose essential information
      if (error.message) {
        if (
          error.message.includes('Email not confirmed') ||
          error.message.includes('email_not_confirmed')
        ) {
          title = 'Email not verified';
          description = 'Please confirm your email to log in.';
          setShowResendVerification(true);
        } else if (error.message.includes('Invalid login credentials')) {
          description =
            'Invalid email or password. Please check your credentials and try again.';
          setShowResendVerification(false);
        } else if (error.message.includes('Too many requests')) {
          title = 'Too many attempts';
          description =
            'Too many login attempts. Please wait a few minutes before trying again.';
          setShowResendVerification(false);
        } else {
          // For all other errors, use generic message to avoid exposing sensitive information
          description =
            'Unable to sign in at this time. Please try again later.';
          setShowResendVerification(false);
        }
      }

      toast({
        title,
        description,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const [lastResendTime, setLastResendTime] = useState<number>(0);
  const RESEND_COOLDOWN = 60000; // 1 minute

  const handleResendVerification = async () => {
    if (!formData.email) {
      toast({
        title: 'Email required',
        description: 'Please enter your email address first.',
        variant: 'destructive',
      });
      return;
    }

    const now = Date.now();
    if (now - lastResendTime < RESEND_COOLDOWN) {
      const remainingTime = Math.ceil(
        (RESEND_COOLDOWN - (now - lastResendTime)) / 1000
      );
      toast({
        title: 'Please wait',
        description: `You can resend the verification email in ${remainingTime} seconds.`,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await resendVerificationEmail(formData.email);

      if (error) {
        throw error;
      }

      setLastResendTime(now);
      toast({
        title: 'Verification email sent',
        description: 'Please check your email for the verification link.',
      });

      setShowResendVerification(false);
    } catch (error: any) {
      toast({
        title: 'Failed to send verification email',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Login</CardTitle>
              <CardDescription>
                Enter your email and password to access your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="text-right text-sm">
                <Link
                  href="/forgot-password"
                  className="text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button className="w-full" type="submit" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>

              {showResendVerification && (
                <div className="my-4 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded">
                  <p className="mb-2 font-semibold">Email not verified</p>
                  <p className="mb-2">Please confirm your email to log in.</p>
                  <Button onClick={handleResendVerification} disabled={isLoading} className="w-full">
                    Resend Email
                  </Button>
                </div>
              )}

              <SocialLogin mode="login" />

              <div className="text-center text-sm">
                Don't have an account?{' '}
                <Link href="/signup" className="text-primary hover:underline">
                  Sign up
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <ProtectedRoute requireAuth={false}>
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
        <LoginForm />
      </Suspense>
    </ProtectedRoute>
  );
}
