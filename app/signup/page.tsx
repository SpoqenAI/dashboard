'use client';

import type React from 'react';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { signUp } from '@/lib/auth';
import { toast } from '@/components/ui/use-toast';
import { SocialLogin } from '@/components/auth/social-login';

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.name || !formData.email || !formData.password) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields.',
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

    setIsLoading(true);

    try {
      const { data, error } = await signUp(formData.email, formData.password);

      if (error) {
        throw error;
      }

      // Create profile after successful signup
      // This will be handled by the RLS policies and triggers we set up

      toast({
        title: 'Account created',
        description: 'Please check your email to verify your account.',
      });

      // Redirect to a confirmation page
      router.push('/signup/confirmation');
    } catch (error: any) {
      toast({
        title: 'Error creating account',
        description: error.message || 'Something went wrong. Please try again.',
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
            <Link href="/login" className="text-sm font-medium">
              Login
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Create an account</CardTitle>
              <CardDescription>
                Start your 14-day free trial. No credit card required.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
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
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button className="w-full" type="submit" disabled={isLoading}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
              
              <SocialLogin mode="signup" />
              
              <div className="text-center text-sm text-muted-foreground">
                By creating an account, you agree to our{' '}
                <Link href="/terms" className="underline underline-offset-4">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="underline underline-offset-4">
                  Privacy Policy
                </Link>
                .
              </div>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
