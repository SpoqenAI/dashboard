'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { signInWithGoogle, signInWithApple, signInWithFacebook } from '@/lib/auth';

// Social provider icons as SVG components
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

const AppleIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

interface SocialLoginProps {
  mode?: 'login' | 'signup';
  className?: string;
}

export function SocialLogin({ mode = 'login', className }: SocialLoginProps) {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleSocialLogin = async (provider: 'google' | 'apple' | 'facebook', providerName: string) => {
    setLoadingProvider(provider);
    
    try {
      let result;
      switch (provider) {
        case 'google':
          result = await signInWithGoogle();
          break;
        case 'apple':
          result = await signInWithApple();
          break;
        case 'facebook':
          result = await signInWithFacebook();
          break;
        default:
          throw new Error('Unsupported provider');
      }

      if (result.error) {
        throw result.error;
      }

      // The redirect will happen automatically via Supabase OAuth flow
      toast({
        title: 'Redirecting...',
        description: `Redirecting to ${providerName} for authentication.`,
      });
    } catch (error: any) {
      toast({
        title: 'Authentication failed',
        description: error.message || `Failed to ${mode} with ${providerName}. Please try again.`,
        variant: 'destructive',
      });
    } finally {
      setLoadingProvider(null);
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
      
      <div className="grid grid-cols-1 gap-3">
        <Button
          variant="outline"
          onClick={() => handleSocialLogin('google', 'Google')}
          disabled={loadingProvider !== null}
          className="w-full"
        >
          {loadingProvider === 'google' ? (
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
          ) : (
            <GoogleIcon />
          )}
          <span className="ml-2">{actionText} with Google</span>
        </Button>
        
        <Button
          variant="outline"
          onClick={() => handleSocialLogin('apple', 'Apple')}
          disabled={loadingProvider !== null}
          className="w-full"
        >
          {loadingProvider === 'apple' ? (
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
          ) : (
            <AppleIcon />
          )}
          <span className="ml-2">{actionText} with Apple</span>
        </Button>
        
        <Button
          variant="outline"
          onClick={() => handleSocialLogin('facebook', 'Facebook')}
          disabled={loadingProvider !== null}
          className="w-full"
        >
          {loadingProvider === 'facebook' ? (
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
          ) : (
            <FacebookIcon />
          )}
          <span className="ml-2">{actionText} with Facebook</span>
        </Button>
      </div>
    </div>
  );
} 