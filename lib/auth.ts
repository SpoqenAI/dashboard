import { getSupabaseClient } from './supabase/client';
import { getSiteUrl } from './site-url';
import { createUserProfile } from './profile';
import { logger } from './logger';
import type { Provider } from '@supabase/supabase-js';

export async function signUp(
  email: string,
  password: string,
  firstName?: string,
  lastName?: string,
  phone?: string
) {
  const supabase = getSupabaseClient();
  const siteUrl = getSiteUrl();

  // Compose display name
  const displayName =
    firstName && lastName ? `${firstName} ${lastName}` : undefined;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
      data: {
        site_url: siteUrl,
        ...(firstName ? { first_name: firstName } : {}),
        ...(lastName ? { last_name: lastName } : {}),
        ...(displayName
          ? { display_name: displayName, full_name: displayName }
          : {}),
        ...(phone ? { phone } : {}),
      },
    },
  });

  // Since email confirmations are disabled, users get immediate sessions
  // Try to create profile if user was created and we have a session
  if (data.user && data.session && !error) {
    // Fire-and-forget profile creation to avoid blocking the signup flow
    // This is a client-side context; the Supabase client already has the user's JWT
    createUserProfile({
      id: data.user.id,
      email: data.user.email!,
      firstName,
      lastName,
      fullName: displayName,
      phone,
    })
      .then(() => {
        logger.auth.info('Profile created successfully for user', {
          userId: data.user ? logger.maskUserId(data.user.id) : undefined,
        });
      })
      .catch((profileError: any) => {
        logger.auth.error('Failed to create user profile', profileError, {
          userId: data.user ? logger.maskUserId(data.user.id) : undefined,
          errorCode: profileError.code,
        });

        // Don't fail the signup process, profile will be created in auth callback
        logger.auth.info('Profile creation will be retried in auth callback');
      });

    logger.auth.info('Profile creation initiated (non-blocking) for user', {
      userId: data.user ? logger.maskUserId(data.user.id) : undefined,
      email: data.user ? logger.maskEmail(data.user.email) : undefined,
      hasSession: !!data.session,
      sessionExpiry: data.session.expires_at,
    });
  } else if (data.user && !data.session) {
    logger.auth.info(
      'User created but no session - profile will be created after email confirmation'
    );
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

export async function signInWithLinkedIn() {
  return signInWithProvider('linkedin_oidc');
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

  const { data, error } = await supabase.auth.resend({
    type: 'signup',
    email,
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
