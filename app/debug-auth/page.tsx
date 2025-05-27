'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSiteUrl } from '@/lib/site-url';

export default function DebugAuthPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const getDebugInfo = () => {
    const info = {
      siteUrl: getSiteUrl(),
      environment: {
        NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
        NEXT_PUBLIC_DEV_PORT: process.env.NEXT_PUBLIC_DEV_PORT,
        NODE_ENV: process.env.NODE_ENV,
      },
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