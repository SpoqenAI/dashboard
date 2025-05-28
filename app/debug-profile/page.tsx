'use client';

import { useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { createUserProfile, checkProfileExists } from '@/lib/profile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DebugProfilePage() {
  const [results, setResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Profile Creation Debug Tool</CardTitle>
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
        </CardContent>
      </Card>
    </div>
  );
} 