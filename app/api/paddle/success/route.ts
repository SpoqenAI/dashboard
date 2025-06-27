'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { randomUUID } from 'crypto';

// Input validation patterns
const USER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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
    logger.warn('PADDLE_SUCCESS', 'User ID exceeds maximum length', { length: userId.length });
    return null;
  }
  
  if (!USER_ID_PATTERN.test(userId)) {
    logger.warn('PADDLE_SUCCESS', 'Invalid user ID format', { userId: logger.maskUserId(userId) });
    return null;
  }
  
  return userId;
}

function validateSubscriptionId(subscriptionId: string | null): string | null {
  if (!subscriptionId) return null;
  
  if (subscriptionId.length > VALIDATION_CONFIG.maxParameterLength) {
    logger.warn('PADDLE_SUCCESS', 'Subscription ID exceeds maximum length', { length: subscriptionId.length });
    return null;
  }
  
  if (!SUBSCRIPTION_ID_PATTERN.test(subscriptionId)) {
    logger.warn('PADDLE_SUCCESS', 'Invalid subscription ID format', { subscriptionId });
    return null;
  }
  
  return subscriptionId;
}

function validateTransactionId(transactionId: string | null): string | null {
  if (!transactionId) return null;
  
  if (transactionId.length > VALIDATION_CONFIG.maxParameterLength) {
    logger.warn('PADDLE_SUCCESS', 'Transaction ID exceeds maximum length', { length: transactionId.length });
    return null;
  }
  
  if (!TRANSACTION_ID_PATTERN.test(transactionId)) {
    logger.warn('PADDLE_SUCCESS', 'Invalid transaction ID format', { transactionId });
    return null;
  }
  
  return transactionId;
}

function generateSecureSubscriptionId(): string {
  return `pending_${randomUUID()}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Validate and sanitize input parameters
    const rawUserId = searchParams.get('user_id');
    const rawTransactionId = searchParams.get('transaction_id');
    const rawSubscriptionId = searchParams.get('subscription_id');
    
    const userId = validateUserId(rawUserId);
    const transactionId = validateTransactionId(rawTransactionId);
    const subscriptionId = validateSubscriptionId(rawSubscriptionId);

    logger.info('PADDLE_SUCCESS', 'Payment success callback received', {
      userId: userId ? logger.maskUserId(userId) : 'invalid',
      transactionId: transactionId || 'invalid',
      subscriptionId: subscriptionId || 'invalid',
      hasValidUserId: !!userId,
      hasValidTransactionId: !!transactionId,
      hasValidSubscriptionId: !!subscriptionId,
    });

    if (!userId) {
      logger.error('PADDLE_SUCCESS', 'Missing or invalid user_id in success callback', new Error('Invalid user_id parameter'), {
        rawUserId: rawUserId ? logger.maskUserId(rawUserId) : 'null',
      });
      return NextResponse.redirect(
        new URL('/onboarding/subscribe?error=invalid_callback', request.url)
      );
    }

    // Use admin client for auth verification and database operations
    const supabase = createSupabaseAdmin();

    // Verify user exists in auth system
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !userData.user) {
      logger.error('PADDLE_SUCCESS', 'User not found in auth system', userError || new Error('User not found'), {
        userId: logger.maskUserId(userId),
      });
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
        new URL('/onboarding/processing?payment=success&instant=true', request.url)
      );
    }

    // Create immediate pending subscription record using atomic upsert function
    const secureSubscriptionId = subscriptionId || generateSecureSubscriptionId();
    
    const pendingSubscriptionData = {
      id: secureSubscriptionId,
      user_id: userId,
      status: 'pending_webhook',
      price_id: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID || null,
      quantity: 1,
      cancel_at_period_end: false,
      current_period_start_at: new Date().toISOString(),
      // Set period end to 1 month from now as placeholder
      current_period_end_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Use atomic upsert function to prevent race conditions
    const { data: upsertResult, error: upsertError } = await supabase
      .rpc('upsert_subscription', {
        p_subscription_data: pendingSubscriptionData
      });

    if (upsertError) {
      logger.error('PADDLE_SUCCESS', 'Failed to upsert pending subscription', upsertError, {
        userId: logger.maskUserId(userId),
        subscriptionId: secureSubscriptionId,
      });
      
      // Still redirect to processing page which will poll for webhook
      return NextResponse.redirect(
        new URL('/onboarding/processing?payment=success&error=subscription_pending', request.url)
      );
    }

    // Check if upsert was successful
    const result = upsertResult as any;
    if (!result?.success) {
      logger.error('PADDLE_SUCCESS', 'Subscription upsert returned error', new Error(result?.error || 'Unknown upsert error'), {
        userId: logger.maskUserId(userId),
        errorCode: result?.error_code,
      });
      
      return NextResponse.redirect(
        new URL('/onboarding/processing?payment=success&error=subscription_pending', request.url)
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

    logger.info('PADDLE_SUCCESS', 'Pending subscription upserted successfully', {
      userId: logger.maskUserId(userId),
      subscriptionId: secureSubscriptionId,
      operation: result.operation,
    });

    // Redirect to processing page with instant success
    return NextResponse.redirect(
      new URL('/onboarding/processing?payment=success&instant=true', request.url)
    );

  } catch (error) {
    logger.error(
      'PADDLE_SUCCESS',
      'Unexpected error in success callback',
      error instanceof Error ? error : new Error(String(error))
    );

    return NextResponse.redirect(
      new URL('/onboarding/subscribe?error=callback_failed', request.url)
    );
  }
} 