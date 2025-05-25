import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        request.cookies.set({
          name,
          value,
          ...options,
        })
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        })
        response.cookies.set({
          name,
          value,
          ...options,
        })
      },
      remove(name: string, options: any) {
        request.cookies.set({
          name,
          value: "",
          ...options,
        })
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        })
        response.cookies.set({
          name,
          value: "",
          ...options,
        })
      },
    },
  })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If the user is not signed in and the route is protected, redirect to login
  if (!session && isProtectedRoute(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // If the user is signed in and the route is auth-only, redirect to dashboard
  if (session && isAuthRoute(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return response
}

// Define which routes are protected (require authentication)
function isProtectedRoute(pathname: string) {
  return pathname.startsWith("/dashboard") || pathname.startsWith("/settings") || pathname.startsWith("/onboarding")
}

// Define which routes are for non-authenticated users only
function isAuthRoute(pathname: string) {
  return pathname === "/login" || pathname === "/signup" || pathname === "/forgot-password"
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|auth/callback).*)"],
}
