import { getSupabaseClient } from './supabase/client';
import { getSiteUrl } from './site-url';
import type { Provider } from '@supabase/supabase-js';

export async function signUp(email: string, password: string) {
  const supabase = getSupabaseClient();
  const siteUrl = getSiteUrl();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
      data: {
        // Store the site URL in the user metadata for reference
        site_url: siteUrl,
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
