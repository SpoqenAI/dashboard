'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { signInWithGoogle } from '@/lib/auth';

// Google provider icon as SVG component
const GoogleIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="currentColor"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="currentColor"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="currentColor"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

interface SocialLoginProps {
  mode?: 'login' | 'signup';
  className?: string;
}

export function SocialLogin({ mode = 'login', className }: SocialLoginProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    
    try {
      const result = await signInWithGoogle();

      if (result.error) {
        throw result.error;
      }

      // The redirect will happen automatically via Supabase OAuth flow
      toast({
        title: 'Redirecting...',
        description: 'Redirecting to Google for authentication.',
      });
    } catch (error: any) {
      toast({
        title: 'Authentication failed',
        description: error.message || `Failed to ${mode} with Google. Please try again.`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const actionText = mode === 'login' ? 'Sign in' : 'Sign up';

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or {actionText.toLowerCase()} with
          </span>
        </div>
      </div>
      
      <Button
        variant="outline"
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
        ) : (
          <GoogleIcon />
        )}
        <span className="ml-2">{actionText} with Google</span>
      </Button>
    </div>
  );
} 