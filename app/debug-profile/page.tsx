'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { createUserProfile, checkProfileExists } from '@/lib/profile';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';
import { getAdminEmails, isDebugEnabled, isProduction } from '@/lib/config';
import { logger } from '@/lib/logger';

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

      // Return early if auth is still loading - don't set authorization state yet
      if (authLoading) {
        return;
      }

      // Require authentication in all cases
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
      logger.error('DebugProfile', 'Error checking authorization:', error as Error);
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
        logger.error('DebugProfile', 'Error checking admin status:', error as Error);
        return false;
      }

      // Check if user email is in admin list
      const adminEmails = getAdminEmails();
      return adminEmails.includes(profile?.email || '');
    } catch (error) {
      logger.error('DebugProfile', 'Error in admin check:', error as Error);
      return false;
    }
  };

  const addResult = (message: string) => {
    setResults(prev => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  const testCurrentUser = async () => {
    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        addResult(`❌ Auth error: ${error.message}`);
        return;
      }

      if (!user) {
        addResult('❌ No authenticated user found');
        return;
      }

      addResult(`✅ Current user: ${user.email} (${user.id})`);
      addResult(
        `📊 User metadata: ${JSON.stringify(user.user_metadata, null, 2)}`
      );

      // Check if profile exists
      const profileExists = await checkProfileExists(user.id);
      addResult(`📋 Profile exists: ${profileExists}`);

      // Try to create profile if it doesn't exist
      if (!profileExists) {
        addResult('🔄 Attempting to create profile...');
        try {
          await createUserProfile({
            id: user.id,
            email: user.email!,
            firstName: user.user_metadata?.first_name,
            lastName: user.user_metadata?.last_name,
            fullName: user.user_metadata?.full_name,
            phone: user.phone || user.user_metadata?.phone,
          });
          addResult('✅ Profile created successfully!');
        } catch (profileError: any) {
          addResult(`❌ Profile creation failed: ${profileError.message}`);
          logger.error('DebugProfile', 'Profile creation error:', profileError as Error);
        }
      }
    } catch (error: any) {
      addResult(`❌ Error: ${error.message}`);
      logger.error('DebugProfile', 'Debug error:', error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const testRLSPolicies = async () => {
    setIsLoading(true);
    let testProfileId: string | null = null;

    try {
      const supabase = getSupabaseClient();

      // Test direct insert to profiles table
      addResult('🔍 Testing direct insert to profiles table...');

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      
      // Explicitly check for auth error first
      if (error) {
        addResult(`❌ Authentication Error: ${error.message}`);
        addResult(`📊 Auth error details: ${JSON.stringify(error, null, 2)}`);
        addResult('⚠️ Cannot proceed with insert test due to authentication failure');
        return;
      }
      
      if (!user) {
        addResult('❌ No authenticated user for RLS test');
        return;
      }

      // Generate a temporary UUID for testing to avoid conflicts
      testProfileId = crypto.randomUUID();

      const testProfile = {
        id: testProfileId,
        email: `test-${testProfileId.slice(0, 8)}@example.com`,
        first_name: 'Test',
        last_name: 'User',
        full_name: 'Test User',
      };

      addResult(`🔧 Using temporary test ID: ${testProfileId.slice(0, 8)}...`);

      const { data, error: insertError } = await supabase
        .from('profiles')
        .insert(testProfile)
        .select()
        .single();

      if (insertError) {
        addResult(`❌ RLS Policy Error: ${insertError.message}`);
        addResult(`📊 Error details: ${JSON.stringify(insertError, null, 2)}`);
      } else {
        addResult('✅ Direct insert successful!');
        addResult(`📊 Created profile: ${JSON.stringify(data, null, 2)}`);
      }
    } catch (error: any) {
      addResult(`❌ RLS Test Error: ${error.message}`);
    } finally {
      // Cleanup: Remove the test profile if it was created
      if (testProfileId) {
        try {
          addResult('🧹 Cleaning up test profile...');
          const supabase = getSupabaseClient();
          const { error: deleteError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', testProfileId);

          if (deleteError) {
            addResult(`⚠️ Cleanup warning: ${deleteError.message}`);
          } else {
            addResult('✅ Test profile cleaned up successfully');
          }
        } catch (cleanupError: any) {
          addResult(`⚠️ Cleanup error: ${cleanupError.message}`);
        }
      }

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
                  user data and database operations. Access is restricted for
                  security reasons.
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

  // Render the debug interface for authorized users
  return (
    <div className="container mx-auto max-w-4xl p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Profile Creation Debug Tool
          </CardTitle>
          <CardDescription>
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
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={testCurrentUser} disabled={isLoading}>
              Test Current User & Profile
            </Button>
            <Button
              onClick={testRLSPolicies}
              disabled={isLoading}
              variant="outline"
            >
              Test RLS Policies
            </Button>
            <Button onClick={clearResults} variant="secondary">
              Clear Results
            </Button>
          </div>

          <div className="max-h-96 overflow-y-auto rounded-lg bg-gray-100 p-4">
            <h3 className="mb-2 font-semibold">Debug Results:</h3>
            {results.length === 0 ? (
              <p className="text-gray-500">
                No results yet. Click a button above to start testing.
              </p>
            ) : (
              <div className="space-y-1">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className="whitespace-pre-wrap font-mono text-sm"
                  >
                    {result}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-sm text-gray-600">
            <p>
              <strong>Instructions:</strong>
            </p>
            <ul className="list-inside list-disc space-y-1">
              <li>Make sure you're logged in before testing</li>
              <li>
                "Test Current User & Profile" checks your auth status and tries
                to create a profile
              </li>
              <li>
                "Test RLS Policies" tests direct database access to understand
                permission issues
              </li>
              <li>Check the browser console for additional error details</li>
            </ul>
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
