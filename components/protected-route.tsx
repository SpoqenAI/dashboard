'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
}

export function ProtectedRoute({
  children,
  redirectTo = '/login',
  requireAuth = true,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Don't redirect if already redirecting or still loading
    if (loading || isRedirecting) {
      return;
    }

    if (requireAuth && !user) {
      // User is not authenticated, redirect to login only if not already there
      if (pathname !== redirectTo) {
        console.log('User not authenticated, redirecting to:', redirectTo);
        setIsRedirecting(true);
        router.replace(redirectTo);
      }
    } else if (!requireAuth && user) {
      // User is authenticated but shouldn't be (e.g., on login page)
      // Only redirect if not already on dashboard
      if (pathname !== '/dashboard') {
        console.log('User already authenticated, redirecting to dashboard');
        setIsRedirecting(true);
        router.replace('/dashboard');
      }
    }
  }, [user, loading, requireAuth, redirectTo, pathname, isRedirecting]);

  // Reset redirecting state when pathname changes (redirect completed)
  useEffect(() => {
    if (isRedirecting) {
      setIsRedirecting(false);
    }
  }, [pathname]);

  // Show loading spinner while checking authentication or redirecting
  if (loading || isRedirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {isRedirecting ? 'Redirecting...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // If requireAuth is true and user is not authenticated, don't render children
  // (redirect will happen in useEffect)
  if (requireAuth && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  // If requireAuth is false and user is authenticated, don't render children
  // (redirect will happen in useEffect)
  if (!requireAuth && user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Render children if authentication requirements are met
  return <>{children}</>;
}
