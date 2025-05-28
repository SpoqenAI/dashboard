import { getSupabaseClient } from './supabase/client';
import { getSiteUrl } from './site-url';
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
