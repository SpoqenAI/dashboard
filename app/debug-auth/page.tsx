'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
              <p className="text-sm text-muted-foreground">Checking access permissions...</p>
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
            <CardTitle className="text-red-800 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription className="text-red-700">
              {!debugEnabled ? (
                <>
                  Debug tools are disabled in this environment. 
                  Contact your system administrator if you need access.
                </>
              ) : productionEnv ? (
                <>
                  This debug page is restricted to authorized administrators only. 
                  If you believe you should have access, please contact your system administrator.
                </>
              ) : (
                <>
                  This debug page requires authentication. Please log in to continue.
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3 p-4 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800">
                <p className="font-medium mb-1">Security Notice:</p>
                <p>
                  This page contains sensitive debugging tools that can expose authentication data and 
                  browser storage information. Access is restricted for security reasons.
                </p>
                <div className="mt-2 space-y-1">
                  <p><strong>Environment:</strong> {productionEnv ? 'Production' : 'Development'}</p>
                  <p><strong>Debug Enabled:</strong> {debugEnabled ? 'Yes' : 'No'}</p>
                  <p><strong>Authentication:</strong> {user ? 'Authenticated' : 'Required'}</p>
                  {productionEnv && (
                    <p><strong>Admin Access:</strong> Required</p>
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
      'NEXT_PUBLIC_SITE_URL': process.env.NEXT_PUBLIC_SITE_URL,
      'NEXT_PUBLIC_DEV_PORT': process.env.NEXT_PUBLIC_DEV_PORT,
      'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
      'NODE_ENV': process.env.NODE_ENV,
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
      _security_note: 'Only NEXT_PUBLIC_ prefixed and NODE_ENV variables are safe for client-side access'
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
        supabaseKeys: Object.keys(localStorage).filter(key => 
          key.includes('supabase') || key.includes('auth') || key.includes('pkce')
        ),
      },
      sessionStorage: {
        keys: Object.keys(sessionStorage),
        supabaseKeys: Object.keys(sessionStorage).filter(key => 
          key.includes('supabase') || key.includes('auth') || key.includes('pkce')
        ),
      },
    };
    setDebugInfo(info);
  };

  const clearBrowserStorage = () => {
    // Clear localStorage
    const localStorageKeys = Object.keys(localStorage);
    localStorageKeys.forEach(key => {
      if (key.includes('supabase') || key.includes('auth') || key.includes('pkce')) {
        localStorage.removeItem(key);
      }
    });

    // Clear sessionStorage
    const sessionStorageKeys = Object.keys(sessionStorage);
    sessionStorageKeys.forEach(key => {
      if (key.includes('supabase') || key.includes('auth') || key.includes('pkce')) {
        sessionStorage.removeItem(key);
      }
    });

    // Clear all cookies
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });

    alert('Browser storage cleared! Please refresh the page and try again.');
  };

  const clearAllStorage = () => {
    localStorage.clear();
    sessionStorage.clear();
    alert('All browser storage cleared! Please refresh the page and try again.');
  };

  return (
    <div className="container mx-auto py-8">
      {/* Security Warning */}
      <Card className="mb-6 border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-amber-800 flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Auth Debug Tool
          </CardTitle>
          <CardDescription className="text-amber-700">
            {isProduction() ? (
              <span className="text-amber-600 font-medium">
                ⚠️ Production Environment - Admin Access Granted
              </span>
            ) : (
              <span className="text-blue-600 font-medium">
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
            Use this page to debug PKCE verification issues and authentication problems
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
              <h3 className="text-lg font-semibold mb-2">Debug Information:</h3>
              <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <h4 className="font-semibold text-yellow-800">Troubleshooting Steps:</h4>
            <ol className="list-decimal list-inside mt-2 text-yellow-700 space-y-1">
              <li>Click "Get Debug Info" to see current configuration</li>
              <li>Click "Clear Auth Storage" to remove PKCE data</li>
              <li>Go back to signup/login and try again</li>
              <li>If still failing, use "Clear All Storage" and restart browser</li>
              <li>Check console logs for getSiteUrl() debug output</li>
            </ol>
          </div>

          {isProduction() && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">Production Warning:</p>
                  <p>
                    You are using debug tools in a production environment. Please use caution 
                    and avoid exposing sensitive information. Consider using these tools in a 
                    development environment when possible.
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