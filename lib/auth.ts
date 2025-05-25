import { getSupabaseClient } from "./supabase/client"
import { getSiteUrl } from "./site-url"

export async function signUp(email: string, password: string) {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  })

  return { data, error }
}

export async function signIn(email: string, password: string) {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  return { data, error }
}

export async function resetPassword(email: string) {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/reset-password`,
  })

  return { data, error }
}

export async function signOut() {
  const supabase = getSupabaseClient()
  return await supabase.auth.signOut()
}
