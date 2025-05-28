'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { createUserProfile, checkProfileExists } from '@/lib/profile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';
import { getAdminEmails, isDebugEnabled, isProduction } from '@/lib/config';

export default function DebugProfilePage() {
  const [results, setResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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
      if (authLoading || !user) {
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

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testCurrentUser = async () => {
    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        addResult(`❌ Auth error: ${error.message}`);
        return;
      }

      if (!user) {
        addResult('❌ No authenticated user found');
        return;
      }

      addResult(`✅ Current user: ${user.email} (${user.id})`);
      addResult(`📊 User metadata: ${JSON.stringify(user.user_metadata, null, 2)}`);
      
      // Check if profile exists
      const profileExists = await checkProfileExists(user.id);
      addResult(`📋 Profile exists: ${profileExists}`);

      // Try to create profile if it doesn't exist
      if (!profileExists) {
        addResult('🔄 Attempting to create profile...');
        await createUserProfile({
          id: user.id,
          email: user.email!,
          firstName: user.user_metadata?.first_name,
          lastName: user.user_metadata?.last_name,
          fullName: user.user_metadata?.full_name,
          phone: user.phone || user.user_metadata?.phone,
        });
        addResult('✅ Profile created successfully!');
      }

    } catch (error: any) {
      addResult(`❌ Error: ${error.message}`);
      console.error('Debug error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testRLSPolicies = async () => {
    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      
      // Test direct insert to profiles table
      addResult('🔍 Testing direct insert to profiles table...');
      
      const { data: user } = await supabase.auth.getUser();
      if (!user.data.user) {
        addResult('❌ No authenticated user for RLS test');
        return;
      }

      const testProfile = {
        id: user.data.user.id,
        email: user.data.user.email!,
        first_name: 'Test',
        last_name: 'User',
        full_name: 'Test User',
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert(testProfile)
        .select()
        .single();

      if (error) {
        addResult(`❌ RLS Policy Error: ${error.message}`);
        addResult(`📊 Error details: ${JSON.stringify(error, null, 2)}`);
      } else {
        addResult('✅ Direct insert successful!');
        addResult(`📊 Created profile: ${JSON.stringify(data, null, 2)}`);
      }

    } catch (error: any) {
      addResult(`❌ RLS Test Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
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
                  This page contains sensitive debugging tools that can expose user data and 
                  database operations. Access is restricted for security reasons.
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

  // Render the debug interface for authorized users
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Profile Creation Debug Tool
          </CardTitle>
          <CardDescription>
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
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button onClick={testCurrentUser} disabled={isLoading}>
              Test Current User & Profile
            </Button>
            <Button onClick={testRLSPolicies} disabled={isLoading} variant="outline">
              Test RLS Policies
            </Button>
            <Button onClick={clearResults} variant="secondary">
              Clear Results
            </Button>
          </div>

          <div className="bg-gray-100 p-4 rounded-lg max-h-96 overflow-y-auto">
            <h3 className="font-semibold mb-2">Debug Results:</h3>
            {results.length === 0 ? (
              <p className="text-gray-500">No results yet. Click a button above to start testing.</p>
            ) : (
              <div className="space-y-1">
                {results.map((result, index) => (
                  <div key={index} className="text-sm font-mono whitespace-pre-wrap">
                    {result}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-sm text-gray-600">
            <p><strong>Instructions:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Make sure you're logged in before testing</li>
              <li>"Test Current User & Profile" checks your auth status and tries to create a profile</li>
              <li>"Test RLS Policies" tests direct database access to understand permission issues</li>
              <li>Check the browser console for additional error details</li>
            </ul>
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