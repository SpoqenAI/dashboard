'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSiteUrl } from '@/lib/site-url';

export default function DebugAuthPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Security check: Only allow this page in development
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              🚫 Access Denied
            </CardTitle>
            <CardDescription className="text-red-700">
              This debug page is only available in development environments for security reasons.
            </CardDescription>
          </CardHeader>
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
      <Card className="mb-6 border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800 flex items-center gap-2">
            🔒 Security Notice
          </CardTitle>
          <CardDescription className="text-red-700">
            This is a debug tool for development purposes only. Environment variables are filtered to prevent exposure of sensitive data.
            Do not use this page in production environments.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Auth Debug Information</CardTitle>
          <CardDescription>
            Use this page to debug PKCE verification issues
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
        </CardContent>
      </Card>
    </div>
  );
} 