import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { getSiteUrl } from "../site-url"

// Create a single instance of the Supabase client to be reused
let supabaseClient: ReturnType<typeof createClientComponentClient> | null = null

export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClientComponentClient({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      options: {
        auth: {
          flowType: "pkce",
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
          // Use the site URL for redirects
          redirectTo: `${getSiteUrl()}/auth/callback`,
        },
      },
    })
  }
  return supabaseClient
}
