'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getSiteUrl } from '@/lib/site-url';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';
import { getAdminEmails, isDebugEnabled, isProduction } from '@/lib/config';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function DebugAuthPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [authCheckLoading, setAuthCheckLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();

  // Check authorization on component mount
  useEffect(() => {
    checkAuthorization();
  }, [user, authLoading]);

  const checkAuthorization = async () => {
    try {
      setAuthCheckLoading(true);

      // Check if debug tools are enabled
      if (!isDebugEnabled()) {
        setIsAuthorized(false);
        return;
      }

      // Require authentication in all cases
      if (authLoading) {
        // Still loading, don't make authorization decision yet
        return;
      }

      if (!user) {
        setIsAuthorized(false);
        return;
      }

      // In production, require admin privileges
      if (isProduction()) {
        const isAdmin = await checkAdminStatus(user.id);
        setIsAuthorized(isAdmin);
      } else {
        // In development, allow any authenticated user
        setIsAuthorized(true);
      }
    } catch (error) {
      console.error('Error checking authorization:', error);
      setIsAuthorized(false);
    } finally {
      setAuthCheckLoading(false);
    }
  };

  const checkAdminStatus = async (userId: string): Promise<boolean> => {
    try {
      const supabase = getSupabaseClient();

      // Get user profile to check email
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error checking admin status:', error);
        return false;
      }

      // Check if user email is in admin list
      const adminEmails = getAdminEmails();
      return adminEmails.includes(profile?.email || '');
    } catch (error) {
      console.error('Error in admin check:', error);
      return false;
    }
  };

  // Show loading while checking authorization
  if (authLoading || authCheckLoading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Checking access permissions...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show access denied if not authorized
  if (!isAuthorized) {
    const debugEnabled = isDebugEnabled();
    const productionEnv = isProduction();

    return (
      <div className="container mx-auto py-8">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <Shield className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription className="text-red-700">
              {!debugEnabled ? (
                <>
                  Debug tools are disabled in this environment. Contact your
                  system administrator if you need access.
                </>
              ) : productionEnv ? (
                <>
                  This debug page is restricted to authorized administrators
                  only. If you believe you should have access, please contact
                  your system administrator.
                </>
              ) : (
                <>
                  This debug page requires authentication. Please log in to
                  continue.
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3 rounded-lg bg-red-100 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
              <div className="text-sm text-red-800">
                <p className="mb-1 font-medium">Security Notice:</p>
                <p>
                  This page contains sensitive debugging tools that can expose
                  authentication data and browser storage information. Access is
                  restricted for security reasons.
                </p>
                <div className="mt-2 space-y-1">
                  <p>
                    <strong>Environment:</strong>{' '}
                    {productionEnv ? 'Production' : 'Development'}
                  </p>
                  <p>
                    <strong>Debug Enabled:</strong>{' '}
                    {debugEnabled ? 'Yes' : 'No'}
                  </p>
                  <p>
                    <strong>Authentication:</strong>{' '}
                    {user ? 'Authenticated' : 'Required'}
                  </p>
                  {productionEnv && (
                    <p>
                      <strong>Admin Access:</strong> Required
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Function to safely filter and mask environment variables
  const getSafeEnvironmentInfo = () => {
    // Only access environment variables that are safe for client-side exposure
    // In Next.js, only NEXT_PUBLIC_ prefixed variables are available on the client
    const safeEnv: Record<string, string | undefined> = {
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      NEXT_PUBLIC_DEV_PORT: process.env.NEXT_PUBLIC_DEV_PORT,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NODE_ENV: process.env.NODE_ENV,
    };

    // Filter out undefined values and create the final safe environment object
    const filteredSafeEnv: Record<string, string> = {};
    let definedCount = 0;

    Object.entries(safeEnv).forEach(([key, value]) => {
      if (value !== undefined) {
        filteredSafeEnv[key] = value;
        definedCount++;
      }
    });

    // Add debug information about what's being shown
    return {
      ...filteredSafeEnv,
      _debug_info: `${definedCount} safe client-accessible variables shown. Server-side and sensitive variables are not accessible from client components.`,
      _security_note:
        'Only NEXT_PUBLIC_ prefixed and NODE_ENV variables are safe for client-side access',
    };
  };

  const getDebugInfo = () => {
    const info = {
      siteUrl: getSiteUrl(),
      environment: getSafeEnvironmentInfo(),
      window: {
        location: window.location.href,
        origin: window.location.origin,
        protocol: window.location.protocol,
        host: window.location.host,
        port: window.location.port,
      },
      localStorage: {
        keys: Object.keys(localStorage),
        supabaseKeys: Object.keys(localStorage).filter(
          key =>
            key.includes('supabase') ||
            key.includes('auth') ||
            key.includes('pkce')
        ),
      },
      sessionStorage: {
        keys: Object.keys(sessionStorage),
        supabaseKeys: Object.keys(sessionStorage).filter(
          key =>
            key.includes('supabase') ||
            key.includes('auth') ||
            key.includes('pkce')
        ),
      },
    };
    setDebugInfo(info);
  };

  const clearBrowserStorage = () => {
    // Clear localStorage
    const localStorageKeys = Object.keys(localStorage);
    localStorageKeys.forEach(key => {
      if (
        key.includes('supabase') ||
        key.includes('auth') ||
        key.includes('pkce')
      ) {
        localStorage.removeItem(key);
      }
    });

    // Clear sessionStorage
    const sessionStorageKeys = Object.keys(sessionStorage);
    sessionStorageKeys.forEach(key => {
      if (
        key.includes('supabase') ||
        key.includes('auth') ||
        key.includes('pkce')
      ) {
        sessionStorage.removeItem(key);
      }
    });

    // Clear only auth-related cookies
    const authCookiePatterns = [
      'supabase',
      'auth',
      'pkce',
      'session',
      'token',
      'refresh',
      'access_token',
      'sb-', // Supabase cookie prefix
      'oauth',
      'csrf',
    ];

    document.cookie.split(';').forEach(function (cookie) {
      const cookieName = cookie.split('=')[0].trim().toLowerCase();

      // Check if cookie name matches any auth-related pattern
      const isAuthCookie = authCookiePatterns.some(pattern =>
        cookieName.includes(pattern.toLowerCase())
      );

      if (isAuthCookie) {
        // Clear the cookie by setting it to expire in the past
        const cookieNameOriginal = cookie.split('=')[0].trim();
        const pastDate = 'Thu, 01 Jan 1970 00:00:00 GMT';
        
        // Basic cookie deletion
        document.cookie = `${cookieNameOriginal}=;expires=${pastDate};path=/`;
        
        // Also try clearing with domain variants and secure attributes
        document.cookie = `${cookieNameOriginal}=;expires=${pastDate};path=/;domain=${window.location.hostname};secure;samesite=lax`;
        document.cookie = `${cookieNameOriginal}=;expires=${pastDate};path=/;domain=.${window.location.hostname};secure;samesite=lax`;
        
        // Additional variants for different cookie configurations
        document.cookie = `${cookieNameOriginal}=;expires=${pastDate};path=/;secure;samesite=lax`;
        document.cookie = `${cookieNameOriginal}=;expires=${pastDate};path=/;samesite=lax`;
        document.cookie = `${cookieNameOriginal}=;expires=${pastDate};path=/;httponly=false;secure;samesite=lax`;
      }
    });

    alert(
      'Auth-related browser storage cleared! Please refresh the page and try again.'
    );
  };

  const clearAllStorage = () => {
    localStorage.clear();
    sessionStorage.clear();
    alert(
      'All browser storage cleared! Please refresh the page and try again.'
    );
  };

  // Safe JSON serialization that handles circular references and non-serializable objects
  const safeStringify = (obj: any, space?: number): string => {
    const seen = new WeakSet();

    try {
      return JSON.stringify(
        obj,
        (key, value) => {
          // Handle circular references
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
              return '[Circular Reference]';
            }
            seen.add(value);
          }

          // Handle functions
          if (typeof value === 'function') {
            return '[Function]';
          }

          // Handle undefined
          if (value === undefined) {
            return '[Undefined]';
          }

          // Handle symbols
          if (typeof value === 'symbol') {
            return '[Symbol]';
          }

          // Handle BigInt
          if (typeof value === 'bigint') {
            return `[BigInt: ${value.toString()}]`;
          }

          return value;
        },
        space
      );
    } catch (error) {
      return `[Serialization Error: ${error instanceof Error ? error.message : 'Unknown error'}]`;
    }
  };

  return (
    <div className="container mx-auto py-8">
      {/* Security Warning */}
      <Card className="mb-6 border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <Shield className="h-5 w-5 text-green-600" />
            Auth Debug Tool
          </CardTitle>
          <CardDescription className="text-amber-700">
            {isProduction() ? (
              <span className="font-medium text-amber-600">
                ⚠️ Production Environment - Admin Access Granted
              </span>
            ) : (
              <span className="font-medium text-blue-600">
                🔧 Development Environment - Debug Mode Active
              </span>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Auth Debug Information</CardTitle>
          <CardDescription>
            Use this page to debug PKCE verification issues and authentication
            problems
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={getDebugInfo}>Get Debug Info</Button>
            <Button onClick={clearBrowserStorage} variant="outline">
              Clear Auth Storage
            </Button>
            <Button onClick={clearAllStorage} variant="destructive">
              Clear All Storage
            </Button>
          </div>

          {debugInfo && (
            <div className="mt-6">
              <h3 className="mb-2 text-lg font-semibold">Debug Information:</h3>
              <pre className="overflow-auto rounded-md bg-gray-100 p-4 text-sm">
                {safeStringify(debugInfo, 2)}
              </pre>
            </div>
          )}

          <div className="mt-6 rounded-md border border-yellow-200 bg-yellow-50 p-4">
            <h4 className="font-semibold text-yellow-800">
              Troubleshooting Steps:
            </h4>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-yellow-700">
              <li>Click "Get Debug Info" to see current configuration</li>
              <li>Click "Clear Auth Storage" to remove PKCE data</li>
              <li>Go back to signup/login and try again</li>
              <li>
                If still failing, use "Clear All Storage" and restart browser
              </li>
              <li>Check console logs for getSiteUrl() debug output</li>
            </ol>
          </div>

          {isProduction() && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                <div className="text-sm text-amber-800">
                  <p className="mb-1 font-medium">Production Warning:</p>
                  <p>
                    You are using debug tools in a production environment.
                    Please use caution and avoid exposing sensitive information.
                    Consider using these tools in a development environment when
                    possible.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
