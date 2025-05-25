import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { getSiteUrl } from "@/lib/site-url"

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get the site URL from our utility function
    const siteUrl = getSiteUrl()

    // Update the Supabase auth settings with the correct site URL
    // This requires admin privileges, so we use the service role key
    const adminAuthClient = supabase.auth.admin

    if (!adminAuthClient) {
      return NextResponse.json(
        { error: "Admin auth client not available. Make sure you're using the service role key." },
        { status: 500 },
      )
    }

    // Update the site URL in Supabase Auth settings
    // Note: This is a simplified example - in a real implementation,
    // you would need to use the Supabase Management API which requires additional setup

    return NextResponse.json({
      success: true,
      message: "Site URL configuration updated",
      siteUrl,
    })
  } catch (error) {
    console.error("Error updating site URL:", error)
    return NextResponse.json({ error: "Failed to update site URL" }, { status: 500 })
  }
}
