import { getSupabaseClient } from './supabase/client';
import { getSiteUrl } from './site-url';
import { createUserProfile } from './profile';
import type { Provider } from '@supabase/supabase-js';

export async function signUp(email: string, password: string, firstName?: string, lastName?: string, phone?: string) {
  const supabase = getSupabaseClient();
  const siteUrl = getSiteUrl();

  // Compose display name
  const displayName = firstName && lastName ? `${firstName} ${lastName}` : undefined;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
      data: {
        site_url: siteUrl,
        ...(firstName ? { first_name: firstName } : {}),
        ...(lastName ? { last_name: lastName } : {}),
        ...(displayName ? { display_name: displayName, full_name: displayName } : {}),
        ...(phone ? { phone } : {}),
      },
    },
  });

  // Since email confirmations are disabled, users get immediate sessions
  // Try to create profile if user was created and we have a session
  if (data.user && data.session && !error) {
    try {
      console.log('Signup: Attempting to create profile for user:', {
        userId: data.user.id,
        email: data.user.email,
        hasSession: !!data.session,
        sessionExpiry: data.session.expires_at
      });

      await createUserProfile({
        id: data.user.id,
        email: data.user.email!,
        firstName,
        lastName,
        fullName: displayName,
        phone,
      });
      console.log('Signup: Profile created successfully for user:', data.user.id);
    } catch (profileError: any) {
      console.error('Signup: Failed to create user profile:', {
        userId: data.user.id,
        error: profileError.message,
        errorCode: profileError.code,
        stack: profileError.stack
      });
      
      // Don't fail the signup process, profile will be created in auth callback
      console.log('Signup: Profile creation will be retried in auth callback');
    }
  } else if (data.user && !data.session) {
    console.log('Signup: User created but no session - profile will be created after email confirmation');
  }

  return { data, error };
}

export async function signIn(email: string, password: string) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
}

export async function signInWithProvider(provider: Provider) {
  const supabase = getSupabaseClient();
  const siteUrl = getSiteUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${siteUrl}/auth/callback`,
    },
  });

  return { data, error };
}

export async function signInWithGoogle() {
  return signInWithProvider('google');
}

export async function resetPassword(email: string) {
  const supabase = getSupabaseClient();
  const siteUrl = getSiteUrl();

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/reset-password`,
  });

  return { data, error };
}

export async function signOut() {
  const supabase = getSupabaseClient();
  return await supabase.auth.signOut();
}

export async function resendVerificationEmail(email: string) {
  const supabase = getSupabaseClient();
  const siteUrl = getSiteUrl();

  const { data, error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });

  return { data, error };
}

export async function updateUserEmail(newEmail: string) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.updateUser({
    email: newEmail,
  });

  return { data, error };
}
