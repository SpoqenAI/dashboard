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
import { PhoneCall } from 'lucide-react';
import { signIn } from '@/lib/auth';
import { toast } from '@/components/ui/use-toast';
import { SocialLogin } from '@/components/auth/social-login';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
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
      toast({
        title: 'Login failed',
        description:
          error.message || 'Invalid email or password. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 text-xl font-bold">
            <PhoneCall className="h-5 w-5 text-primary" />
            <Link href="/">Spoqen</Link>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/signup" className="text-sm font-medium">
              Sign Up
            </Link>
          </nav>
        </div>
      </header>
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
  );
}
