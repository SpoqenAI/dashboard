import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check for active subscription
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('status, id, current_period_start_at, current_period_end_at')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (subscriptionError) {
      logger.error(
        'SUBSCRIPTION_CHECK_API',
        'Error checking subscription status',
        subscriptionError instanceof Error 
          ? subscriptionError 
          : new Error(JSON.stringify(subscriptionError)),
        { userId: logger.maskUserId(user.id) }
      );
      
      return NextResponse.json(
        { error: 'Failed to check subscription status' },
        { status: 500 }
      );
    }

    if (subscription) {
      logger.info(
        'SUBSCRIPTION_CHECK_API',
        'Active subscription found via manual check',
        {
          userId: logger.maskUserId(user.id),
          subscriptionId: subscription.id,
          status: subscription.status,
        }
      );

      return NextResponse.json({
        hasActiveSubscription: true,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          current_period_start_at: subscription.current_period_start_at,
          current_period_end_at: subscription.current_period_end_at,
        },
      });
    }

    return NextResponse.json({
      hasActiveSubscription: false,
      subscription: null,
    });
  } catch (error) {
    logger.error(
      'SUBSCRIPTION_CHECK_API',
      'Unexpected error in subscription check',
      error instanceof Error ? error : new Error(String(error))
    );

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 