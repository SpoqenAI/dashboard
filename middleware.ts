import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Get the current user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage = ['/login', '/signup', '/auth', '/forgot-password', '/reset-password'].some(
    (path) => request.nextUrl.pathname.startsWith(path)
  );
  const isPublicPage = ['/privacy', '/terms', '/contact'].includes(request.nextUrl.pathname);
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
  const isOnboardingPage = request.nextUrl.pathname.startsWith('/onboarding');

  // Allow public pages, API routes, and auth pages without authentication
  if (isPublicPage || isApiRoute || (isAuthPage && !user)) {
    return response;
  }

  // Redirect unauthenticated users to login (except for auth pages)
  if (!user && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If user is authenticated, check subscription status for protected routes
  if (user) {
    // Allow auth pages for authenticated users (they'll be redirected by ProtectedRoute component)
    if (isAuthPage) {
      return response;
    }

    try {
      // Check if user has an active subscription
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        console.error('Error checking subscription status:', error);
        // On error, allow access but log the issue
        return response;
      }

      const hasActiveSubscription = !!subscription;

      // If user has active subscription
      if (hasActiveSubscription) {
        // Redirect away from onboarding pages to main dashboard
        if (isOnboardingPage) {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
        // Allow access to all other pages
        return response;
      }

      // If user doesn't have active subscription (new user)
      if (!hasActiveSubscription) {
        // Allow access to onboarding pages
        if (isOnboardingPage) {
          return response;
        }
        // Redirect to onboarding for all other protected routes
        return NextResponse.redirect(new URL('/onboarding/profile', request.url));
      }
    } catch (error) {
      console.error('Middleware error:', error);
      // On unexpected errors, allow access but log
      return response;
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}; 