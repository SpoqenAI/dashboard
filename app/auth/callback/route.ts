import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') ?? '/';

  // Handle OAuth error cases
  if (error) {
    console.error('OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || '')}&message=${encodeURIComponent('Authentication failed. Please try again.')}`, request.url)
    );
  }

  // Handle missing code parameter
  if (!code) {
    console.error('No code parameter in OAuth callback');
    return NextResponse.redirect(
      new URL('/login?error=missing_code&message=Authentication failed. Please try again.', request.url)
    );
  }

  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Exchange the code for a session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError);
      return NextResponse.redirect(
        new URL(`/login?error=exchange_failed&message=${encodeURIComponent('Authentication failed. Please try again.')}`, request.url)
      );
    }

    // Check if we have a valid session
    if (!data.session) {
      console.error('No session created after code exchange');
      return NextResponse.redirect(
        new URL('/login?error=no_session&message=Authentication failed. Please try again.', request.url)
      );
    }

    console.log('Authentication successful for user:', data.user?.id, 'type:', type);

    // Handle different types of authentication callbacks
    if (type === 'recovery') {
      // Password reset flow - redirect to reset password page
      return NextResponse.redirect(new URL('/reset-password', request.url));
    } else if (type === 'signup') {
      // Email confirmation flow - redirect to onboarding for new users
      return NextResponse.redirect(new URL('/onboarding', request.url));
    } else {
      // OAuth or regular login flow
      // Check if this is a new user (first time signing in)
      const isNewUser = data.user?.created_at === data.user?.last_sign_in_at;
      
      // Redirect based on user status
      if (isNewUser) {
        // Redirect new users to onboarding
        return NextResponse.redirect(new URL('/onboarding', request.url));
      } else {
        // Redirect existing users to dashboard or specified next URL
        const redirectUrl = next.startsWith('/') ? next : '/dashboard';
        return NextResponse.redirect(new URL(redirectUrl, request.url));
      }
    }

  } catch (error) {
    console.error('Unexpected error in OAuth callback:', error);
    return NextResponse.redirect(
      new URL('/login?error=unexpected&message=An unexpected error occurred. Please try again.', request.url)
    );
  }
}
