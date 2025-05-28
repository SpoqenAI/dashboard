'use client';

import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import { logger } from '@/lib/logger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
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
          case 'SIGNED_IN':
            logger.auth.event('User signed in', session);
            break;
          case 'SIGNED_OUT':
            logger.auth.info('User signed out');
            // Redirect to login page when signed out, but only if not already on login page
            if (pathname !== '/login') {
              router.replace('/login');
            }
            break;
          case 'TOKEN_REFRESHED':
            logger.auth.event('Token refreshed', session);
            break;
          case 'USER_UPDATED':
            logger.auth.event('User updated', session);
            break;
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [supabase, router, pathname]);

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        logger.auth.error('Error signing out', error);
        throw error;
      }
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
