'use client';

import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import { logger } from '@/lib/logger';
import { mutate } from 'swr';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearAllCaches: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Create a stable Supabase client reference
  const supabase = useMemo(() => getSupabaseClient(), []);

  // Clear all SWR caches - this is critical for preventing data leakage
  const clearAllCaches = () => {
    // Clear all SWR caches to prevent data leakage between users
    mutate(() => true, undefined, { revalidate: false });

    // CRITICAL SECURITY FIX: Clear localStorage items that could contain user-specific data
    if (typeof window !== 'undefined') {
      try {
        // Clear analytics events that may contain user session data
        localStorage.removeItem('analytics_events');

        // Clear billing notification preferences
        localStorage.removeItem('billingNotificationPreferences');

        // Clear any other potential user-specific localStorage items
        // Note: We're being selective to avoid clearing theme preferences, etc.

        logger.auth.info(
          'All SWR caches and user-specific localStorage cleared for security'
        );
      } catch (error) {
        // Handle cases where localStorage is not available (SSR, private browsing, etc.)
        logger.auth.warn(
          'Could not clear localStorage',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    } else {
      logger.auth.info(
        'SWR caches cleared for security (server-side environment)'
      );
    }
  };

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          logger.auth.error('Error getting session', error);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
          logger.auth.debug('Initial session retrieved', {
            hasSession: !!session,
          });
        }
      } catch (error) {
        logger.auth.error('Error in getInitialSession', error as Error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        logger.auth.event(event, session);

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Handle different auth events
        switch (event) {
          case 'SIGNED_OUT':
            logger.auth.info('User signed out - clearing all caches');
            // CRITICAL SECURITY FIX: Clear all caches on sign out
            clearAllCaches();
            // Redirect to login page when signed out, but only if not already on login page
            if (window.location.pathname !== '/login') {
              router.replace('/login');
            }
            break;
          case 'SIGNED_IN':
            // Clear caches on sign in to ensure fresh data for new user
            clearAllCaches();
            logger.auth.info(
              'User signed in - caches cleared for fresh session'
            );
            break;
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [supabase, router]);

  const signOut = async () => {
    try {
      setLoading(true);

      // CRITICAL: Clear all caches BEFORE signing out to prevent race conditions
      clearAllCaches();

      const { error } = await supabase.auth.signOut();
      if (error) {
        logger.auth.error('Error signing out', error);
        throw error;
      }

      logger.auth.info('Sign out completed successfully');
    } catch (error) {
      logger.auth.error('Sign out error', error as Error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const refreshSession = async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.refreshSession();
      if (error) {
        logger.auth.error('Error refreshing session', error);
        throw error;
      }
      setSession(session);
      setUser(session?.user ?? null);
      logger.auth.debug('Session refreshed successfully');
    } catch (error) {
      logger.auth.error('Refresh session error', error as Error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut,
    refreshSession,
    clearAllCaches,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
