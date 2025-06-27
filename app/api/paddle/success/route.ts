'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const transactionId = searchParams.get('transaction_id');
    const subscriptionId = searchParams.get('subscription_id');

    logger.info('PADDLE_SUCCESS', 'Payment success callback received', {
      userId: userId ? logger.maskUserId(userId) : 'unknown',
      transactionId,
      subscriptionId,
      params: Object.fromEntries(searchParams.entries()),
    });

    if (!userId) {
      logger.error('PADDLE_SUCCESS', 'Missing user_id in success callback');
      return NextResponse.redirect(
        new URL('/onboarding/subscribe?error=invalid_callback', request.url)
      );
    }

    const supabase = await createClient();

    // Verify user exists and is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || user.id !== userId) {
      logger.error('PADDLE_SUCCESS', 'User authentication failed', authError || new Error('User not authenticated'), {
        userId: logger.maskUserId(userId),
        authenticatedUserId: user?.id ? logger.maskUserId(user.id) : 'none',
      });
      return NextResponse.redirect(
        new URL('/login?error=authentication_required', request.url)
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

    // Create immediate pending subscription record
    const pendingSubscriptionData = {
      id: subscriptionId || `pending_${Date.now()}_${userId.slice(-8)}`,
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

    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert(pendingSubscriptionData);

    if (subscriptionError) {
      logger.error('PADDLE_SUCCESS', 'Failed to create pending subscription', subscriptionError, {
        userId: logger.maskUserId(userId),
      });
      
      // Still redirect to processing page which will poll for webhook
      return NextResponse.redirect(
        new URL('/onboarding/processing?payment=success&error=subscription_pending', request.url)
      );
    }

    // Update profile with any payment info we might have
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        // Store transaction info for reference
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (profileError) {
      logger.warn('PADDLE_SUCCESS', 'Failed to update profile', {
        userId: logger.maskUserId(userId),
        errorDetails: profileError.message || 'Unknown profile update error',
      });
    }

    logger.info('PADDLE_SUCCESS', 'Pending subscription created successfully', {
      userId: logger.maskUserId(userId),
      subscriptionId: pendingSubscriptionData.id,
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