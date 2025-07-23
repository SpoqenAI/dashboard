import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';
import { ensureUserProfile } from '@/lib/profile';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') ?? '/';

  // Log the callback details for debugging
  logger.info('AUTH', 'Auth callback received', {
    url: request.url,
    code: code ? `${code.substring(0, 10)}...` : null,
    error,
    errorDescription,
    type,
    host: request.headers.get('host'),
    origin: request.headers.get('origin'),
  });

  // Handle OAuth error cases
  if (error) {
    logger.error('AUTH', 'OAuth error', undefined, {
      error,
      errorDescription,
    });
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || '')}&message=${encodeURIComponent('Authentication failed. Please try again.')}`,
        request.url
      )
    );
  }

  // Handle missing code parameter
  if (!code) {
    logger.error('AUTH', 'No code parameter in OAuth callback');
    return NextResponse.redirect(
      new URL(
        '/login?error=missing_code&message=Authentication failed. Please try again.',
        request.url
      )
    );
  }

  try {
    const supabase = await createSupabaseClient();

    // Exchange the code for a session
    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      logger.error('AUTH', 'Error exchanging code for session', exchangeError, {
        errorMessage: exchangeError.message || 'Unknown error',
      });

      // Add more specific error handling for common issues
      let errorMessage = 'Authentication failed. Please try again.';

      if (exchangeError.message?.includes('expired')) {
        errorMessage =
          'The verification link has expired. Please request a new verification email.';
      } else if (exchangeError.message?.includes('invalid')) {
        errorMessage =
          'The verification link is invalid. Please request a new verification email.';
      } else if (exchangeError.message?.includes('already_used')) {
        errorMessage =
          'This verification link has already been used. Please try logging in directly.';
      } else if (
        exchangeError.message?.includes('code challenge') ||
        exchangeError.message?.includes('code verifier')
      ) {
        errorMessage =
          'The verification link is not compatible with this browser session. Please try logging in directly or request a new verification email.';
      }

      return NextResponse.redirect(
        new URL(
          `/login?error=exchange_failed&message=${encodeURIComponent(errorMessage)}`,
          request.url
        )
      );
    }

    // Check if we have a valid session
    if (!data.session) {
      logger.error('AUTH', 'No session created after code exchange');
      return NextResponse.redirect(
        new URL(
          '/login?error=no_session&message=Authentication failed. Please try again.',
          request.url
        )
      );
    }

    // Log successful authentication with masked user ID for security
    logger.info('AUTH', 'Authentication successful', {
      userId: data.user?.id ? logger.maskUserId(data.user.id) : 'unknown',
      type,
    });

    // Ensure user profile exists (especially important for OAuth users)
    if (data.user) {
      try {
        logger.info('AUTH', 'Auth callback: Ensuring user profile for user', {
          userId: logger.maskUserId(data.user.id),
          email: logger.maskEmail(data.user.email),
          hasSession: !!data.session,
          hasUserMetadata: !!data.user.user_metadata,
        });

        // Pass the JWT-initialized Supabase client so that auth.uid() in Postgres resolves to the correct user (RLS)
        await ensureUserProfile(data.user, supabase);
        logger.info(
          'AUTH',
          'Auth callback: Profile ensured successfully for user',
          {
            userId: logger.maskUserId(data.user.id),
          }
        );
      } catch (profileError: any) {
        logger.error(
          'AUTH',
          'Auth callback: Failed to ensure user profile',
          profileError,
          {
            userId: logger.maskUserId(data.user.id),
            errorMessage: profileError.message,
          }
        );
        // Don't fail the auth flow, but log the error for monitoring
      }
    }

    // Handle different types of authentication callbacks
    if (type === 'recovery') {
      // Password reset flow - redirect to reset password page
      return NextResponse.redirect(new URL('/reset-password', request.url));
    } else if (type === 'signup') {
      // Email confirmation flow - redirect to onboarding for new users
      return NextResponse.redirect(new URL('/welcome', request.url));
    } else if (type === 'email_change') {
      // Email change verification flow
      const user = data.user;

      if (user && user.email) {
        try {
          // Update the profile table with the new verified email
          const { error: profileUpdateError } = await supabase
            .from('profiles')
            .update({ email: user.email })
            .eq('id', user.id);

          if (profileUpdateError) {
            logger.error(
              'AUTH',
              'Failed to update profile email after verification',
              profileUpdateError,
              {
                userId: logger.maskUserId(user.id),
                newEmail: logger.maskEmail(user.email),
              }
            );
          } else {
            logger.info(
              'AUTH',
              'Profile email updated successfully after verification',
              {
                userId: logger.maskUserId(user.id),
                newEmail: logger.maskEmail(user.email),
              }
            );
          }
        } catch (error: any) {
          logger.error(
            'AUTH',
            'Error updating profile email after verification',
            error,
            {
              userId: logger.maskUserId(user.id),
              errorMessage: error.message,
            }
          );
        }
      }

      // Redirect to profile page with success message
      return NextResponse.redirect(
        new URL('/profile?email_updated=true', request.url)
      );
    } else {
      // OAuth or email verification flow
      // Check if this is email verification (user exists but was just confirming email)
      const user = data.user;

      if (user) {
        // Check if user just confirmed their email (email_confirmed_at is recent)
        const emailConfirmedAt = user.email_confirmed_at;
        const createdAt = user.created_at;

        if (emailConfirmedAt && createdAt) {
          const emailConfirmedTime = new Date(emailConfirmedAt).getTime();
          const createdTime = new Date(createdAt).getTime();
          const now = Date.now();

          // If email was confirmed recently (within 10 minutes) and user was created recently (within 1 hour)
          // this is likely an email verification flow
          const isRecentEmailConfirmation =
            now - emailConfirmedTime < 10 * 60 * 1000; // 10 minutes
          const isRecentSignup = now - createdTime < 60 * 60 * 1000; // 1 hour

          if (isRecentEmailConfirmation && isRecentSignup) {
            // This is email verification for a new user - redirect to onboarding
            return NextResponse.redirect(new URL('/welcome', request.url));
          }
        }

        // Check if this is a new user (first time signing in via OAuth)
        const isNewUser =
          user.created_at &&
          user.last_sign_in_at &&
          Math.abs(
            new Date(user.created_at).getTime() -
              new Date(user.last_sign_in_at).getTime()
          ) < 5000; // 5 second threshold

        // Redirect based on user status
        if (isNewUser) {
          // Redirect new users to onboarding
          return NextResponse.redirect(new URL('/welcome', request.url));
        } else {
          const isValidRedirectPath = (path: string) => {
            return (
              path.startsWith('/') &&
              !path.startsWith('//') &&
              !path.includes('..') &&
              !path.includes('\\')
            );
          };

          // Redirect existing users to dashboard or specified next URL
          const redirectUrl = isValidRedirectPath(next) ? next : '/recent-calls';
          return NextResponse.redirect(new URL(redirectUrl, request.url));
        }
      } else {
        // No user data - something went wrong
        logger.error('AUTH', 'No user data in successful auth callback');
        return NextResponse.redirect(
          new URL(
            '/login?error=no_user&message=Authentication completed but no user data found. Please try logging in.',
            request.url
          )
        );
      }
    }
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('AUTH', 'Unexpected error in OAuth callback', errorObj);
    return NextResponse.redirect(
      new URL(
        '/login?error=unexpected&message=An unexpected error occurred. Please try again.',
        request.url
      )
    );
  }
}
