'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { randomUUID } from 'crypto';
import { provisionAssistant } from '@/lib/actions/assistant.actions';

// Input validation patterns
const USER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SUBSCRIPTION_ID_PATTERN = /^(sub_|pending_)[a-zA-Z0-9_-]+$/;
const TRANSACTION_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

// Configuration
const VALIDATION_CONFIG = {
  maxParameterLength: 100,
  allowedPaddleIdPrefixes: ['sub_', 'txn_', 'pri_', 'ctm_'],
} as const;

// Function to create admin Supabase client using service role key for RLS bypass
function createSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing required Supabase environment variables for admin client'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

// Input validation functions
function validateUserId(userId: string | null): string | null {
  if (!userId) return null;

  if (userId.length > VALIDATION_CONFIG.maxParameterLength) {
    logger.warn('PADDLE_SUCCESS', 'User ID exceeds maximum length', {
      length: userId.length,
    });
    return null;
  }

  if (!USER_ID_PATTERN.test(userId)) {
    logger.warn('PADDLE_SUCCESS', 'Invalid user ID format', {
      userId: logger.maskUserId(userId),
    });
    return null;
  }

  return userId;
}

function validateSubscriptionId(subscriptionId: string | null): string | null {
  if (!subscriptionId) return null;

  if (subscriptionId.length > VALIDATION_CONFIG.maxParameterLength) {
    logger.warn('PADDLE_SUCCESS', 'Subscription ID exceeds maximum length', {
      length: subscriptionId.length,
    });
    return null;
  }

  if (!SUBSCRIPTION_ID_PATTERN.test(subscriptionId)) {
    logger.warn('PADDLE_SUCCESS', 'Invalid subscription ID format', {
      subscriptionId,
    });
    return null;
  }

  return subscriptionId;
}

function validateTransactionId(transactionId: string | null): string | null {
  if (!transactionId) return null;

  if (transactionId.length > VALIDATION_CONFIG.maxParameterLength) {
    logger.warn('PADDLE_SUCCESS', 'Transaction ID exceeds maximum length', {
      length: transactionId.length,
    });
    return null;
  }

  if (!TRANSACTION_ID_PATTERN.test(transactionId)) {
    logger.warn('PADDLE_SUCCESS', 'Invalid transaction ID format', {
      transactionId,
    });
    return null;
  }

  return transactionId;
}

function generateSecureSubscriptionId(): string {
  return `pending_${randomUUID()}`;
}

// Trigger assistant provisioning for new subscribers
async function triggerAssistantProvisioning(
  userId: string,
  subscriptionId: string
): Promise<void> {
  try {
    logger.info('ASSISTANT_PROVISIONING', 'Starting provisioning workflow', {
      userId: logger.maskUserId(userId),
    });

    const supabase = createSupabaseAdmin();

    // Update provisioning status to indicate start
    await supabase
      .from('user_settings')
      .update({
        assistant_provisioning_status: 'in_progress',
        assistant_provisioning_started_at: new Date().toISOString(),
      })
      .eq('id', userId);

    // Trigger the actual provisioning (idempotent – skips if number exists)
    await provisionAssistant(userId);

    // Update provisioning status to completed
    await supabase
      .from('user_settings')
      .update({
        assistant_provisioning_status: 'completed',
        assistant_provisioning_completed_at: new Date().toISOString(),
      })
      .eq('id', userId);

    logger.info(
      'ASSISTANT_PROVISIONING',
      'Provisioning completed successfully',
      {
        userId: logger.maskUserId(userId),
        subscriptionId,
      }
    );
  } catch (error: any) {
    const errorMessage = `Assistant provisioning failed: ${error.message}`;
    logger.error(
      'ASSISTANT_PROVISIONING',
      errorMessage,
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: logger.maskUserId(userId),
        subscriptionId,
      }
    );

    // Update provisioning status to failed
    try {
      const supabase = createSupabaseAdmin();
      await supabase
        .from('user_settings')
        .update({
          assistant_provisioning_status: 'failed',
          assistant_provisioning_error: error.message,
        })
        .eq('id', userId);
    } catch (updateError) {
      logger.error(
        'ASSISTANT_PROVISIONING',
        'Failed to update provisioning status',
        updateError as Error
      );
    }

    throw error; // Re-throw to be handled by caller
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Declare variables at function scope to avoid scoping issues in catch block
  let userId: string | null = null;
  let transactionId: string | null = null;
  let subscriptionId: string | null = null;

  try {
    const { searchParams } = new URL(request.url);

    // Validate and sanitize input parameters
    const rawUserId = searchParams.get('user_id');
    const rawTransactionId = searchParams.get('transaction_id');
    const rawSubscriptionId = searchParams.get('subscription_id');

    userId = validateUserId(rawUserId);
    transactionId = validateTransactionId(rawTransactionId);
    subscriptionId = validateSubscriptionId(rawSubscriptionId);

    // No analytics

    logger.info('PADDLE_SUCCESS', 'Payment success callback received', {
      userId: userId ? logger.maskUserId(userId) : 'invalid',
      transactionId: transactionId || 'invalid',
      subscriptionId: subscriptionId || 'invalid',
      hasValidUserId: !!userId,
      hasValidTransactionId: !!transactionId,
      hasValidSubscriptionId: !!subscriptionId,
    });

    if (!userId) {
      logger.error(
        'PADDLE_SUCCESS',
        'Missing or invalid user_id in success callback',
        new Error('Invalid user_id parameter'),
        {
          rawUserId: rawUserId ? logger.maskUserId(rawUserId) : 'null',
        }
      );
      return NextResponse.redirect(
        new URL('/login?error=invalid_callback', request.url)
      );
    }

    // Use admin client for auth verification and database operations
    const supabase = createSupabaseAdmin();

    // Verify user exists in auth system
    const { data: userData, error: userError } =
      await supabase.auth.admin.getUserById(userId);
    if (userError || !userData.user) {
      logger.error(
        'PADDLE_SUCCESS',
        'User not found in auth system',
        userError || new Error('User not found'),
        {
          userId: logger.maskUserId(userId),
        }
      );
      return NextResponse.redirect(
        new URL('/login?error=user_not_found', request.url)
      );
    }

    // Check if subscription already exists (webhook might have arrived first)
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingSubscription) {
      logger.info('PADDLE_SUCCESS', 'Subscription already exists', {
        userId: logger.maskUserId(userId),
        subscriptionId: existingSubscription.id,
        status: existingSubscription.status,
      });

      // Redirect to processing page which will find the existing subscription
      return NextResponse.redirect(
        new URL('/recent-calls?payment=success&instant=true', request.url)
      );
    }

    // Create immediate active subscription record for faster user experience
    const secureSubscriptionId =
      subscriptionId || generateSecureSubscriptionId();

    const subscriptionData = {
      id: secureSubscriptionId,
      user_id: userId,
      status: 'active', // Create as active immediately for faster UX
      price_id: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID || null,
      quantity: 1,
      cancel_at_period_end: false,
      current_period_start_at: new Date().toISOString(),
      // Set period end to 1 month from now as placeholder
      current_period_end_at: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
    };

    // Use atomic upsert function to prevent race conditions
    const { data: upsertResult, error: upsertError } = await supabase.rpc(
      'upsert_subscription',
      {
        p_subscription_data: subscriptionData,
      }
    );

    if (upsertError) {
      logger.error(
        'PADDLE_SUCCESS',
        'Failed to upsert subscription',
        upsertError,
        {
          userId: logger.maskUserId(userId),
          subscriptionId: secureSubscriptionId,
        }
      );

      // Still redirect to processing page for error handling
      return NextResponse.redirect(
        new URL(
          '/recent-calls?payment=success&error=subscription_failed',
          request.url
        )
      );
    }

    // Check if upsert was successful
    const result = upsertResult as any;
    if (!result?.success) {
      logger.error(
        'PADDLE_SUCCESS',
        'Subscription upsert returned error',
        new Error(result?.error || 'Unknown upsert error'),
        {
          userId: logger.maskUserId(userId),
          errorCode: result?.error_code,
        }
      );

      return NextResponse.redirect(
        new URL(
          '/recent-calls?payment=success&error=subscription_failed',
          request.url
        )
      );
    }

    // Update profile with any payment info we might have
    const profileUpdateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Only add transaction info if it's valid
    if (transactionId) {
      profileUpdateData.last_transaction_id = transactionId;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update(profileUpdateData)
      .eq('id', userId);

    if (profileError) {
      logger.warn('PADDLE_SUCCESS', 'Failed to update profile', {
        userId: logger.maskUserId(userId),
        errorDetails: profileError.message || 'Unknown profile update error',
      });
    }

    logger.info('PADDLE_SUCCESS', 'Active subscription created successfully', {
      userId: logger.maskUserId(userId),
      subscriptionId: secureSubscriptionId,
      operation: result.operation,
    });

    // 4. Trigger assistant provisioning in background (with enhanced error handling)
    // Remove all assistant provisioning logic here. Do not call triggerAssistantProvisioning or provisionAssistant in this route.
    // Continue with the rest of the success flow as normal.

    // 5. Mark onboarding as completed
    try {
      await supabase
        .from('profiles')
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('id', userId);

      logger.info('PADDLE_SUCCESS', 'Onboarding marked as completed', {
        userId: logger.maskUserId(userId),
      });
    } catch (error) {
      logger.error(
        'PADDLE_SUCCESS',
        'Failed to mark onboarding as completed',
        error as Error,
        {
          userId: logger.maskUserId(userId),
        }
      );
    }

    //

    // Log performance metrics
    //

    logger.info('PADDLE_SUCCESS', 'Success callback performance', {
      userId: logger.maskUserId(userId),
      processingTimeMs: Date.now() - startTime,
      hasTransactionId: !!transactionId,
      hasSubscriptionId: !!(subscriptionId || generateSecureSubscriptionId()),
    });

    // 6. Enhanced redirect logic with robust URL handling
    const redirectUrl = determineRedirectUrl(
      request,
      '/getting-started?payment=success'
    );

    logger.info('PADDLE_SUCCESS', 'Redirecting user after successful payment', {
      userId: logger.maskUserId(userId),
      redirectUrl,
      processingTimeMs: Date.now() - startTime,
    });

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    logger.error(
      'PADDLE_SUCCESS',
      'Unexpected error in success callback',
      errorObj,
      {
        userId: userId ? logger.maskUserId(userId) : 'unknown',
        transactionId: transactionId || 'unknown',
        subscriptionId: subscriptionId || 'unknown',
        processingTimeMs: Date.now() - startTime,
      }
    );

    // Track the error for monitoring
    if (userId) {
      //
    }

    // Redirect to error page with recovery options
    const errorRedirectUrl = determineRedirectUrl(
      request,
      `/settings?tab=billing&error=payment_processing_failed&message=${encodeURIComponent('Payment was successful but there was an issue completing your setup. Please contact support if this persists.')}`
    );

    return NextResponse.redirect(errorRedirectUrl);
  }
}

/**
 * Determines the appropriate redirect URL with robust fallback logic
 * Prevents unexpected redirects to localhost in production environments
 */
function determineRedirectUrl(
  request: NextRequest,
  fallbackPath: string
): string {
  try {
    // Get the base URL from the request
    const requestUrl = new URL(request.url);
    let baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
    // If behind a proxy like ngrok/Vercel, prefer the forwarded host header
    const forwardedHost = request.headers.get('x-forwarded-host');
    if (forwardedHost) {
      const forwardedProto =
        request.headers.get('x-forwarded-proto') ||
        requestUrl.protocol.replace(':', '');
      baseUrl = `${forwardedProto}://${forwardedHost}`;
    }
    const configuredUrl =
      process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
    // If we detect localhost but we have a configured public URL (ngrok / prod), prefer it
    if (baseUrl.includes('localhost') && configuredUrl) {
      return new URL(fallbackPath, configuredUrl).toString();
    }
    // Validate that we're not redirecting to localhost in production
    if (
      process.env.NODE_ENV === 'production' &&
      baseUrl.includes('localhost')
    ) {
      logger.error(
        'PADDLE_SUCCESS',
        'Production environment attempting localhost redirect',
        new Error('Invalid redirect URL'),
        {
          requestUrl: request.url,
          baseUrl,
          fallbackPath,
        }
      );
      if (!configuredUrl) {
        throw new Error('No production URL configured for redirect');
      }
      return new URL(fallbackPath, configuredUrl).toString();
    }
    // Create the redirect URL when baseUrl is acceptable
    const redirectUrl = new URL(fallbackPath, baseUrl);
    logger.debug('PADDLE_SUCCESS', 'Redirect URL determined', {
      requestUrl: request.url,
      baseUrl,
      fallbackPath,
      finalUrl: redirectUrl.toString(),
    });
    return redirectUrl.toString();
  } catch (error) {
    logger.error(
      'PADDLE_SUCCESS',
      'Error determining redirect URL',
      error as Error,
      {
        requestUrl: request.url,
        fallbackPath,
      }
    );
    const emergencyUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000';
    return new URL(fallbackPath, emergencyUrl).toString();
  }
}
