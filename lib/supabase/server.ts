import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { getSiteUrl } from "../site-url"

export function getServerSupabaseClient() {
  const cookieStore = cookies()

  return createServerComponentClient({
    cookies: () => cookieStore,
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
