import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const supabase = createSupabaseAdmin();

    // Check for orphaned pending subscriptions
    const { data: pendingSubs, error: pendingError } = await supabase
      .from('subscriptions')
      .select('id, paddle_customer_id, created_at, status, tier_type')
      .is('user_id', null)
      .order('created_at', { ascending: false });

    if (pendingError) {
      logger.error(
        'SUBSCRIPTION_HEALTH',
        'Failed to fetch pending subscriptions',
        pendingError
      );
    }

    // Check for users without paddle_customer_id
    const { data: unlinkedUsers, error: unlinkedError } = await supabase
      .from('profiles')
      .select('id, email, created_at')
      .is('paddle_customer_id', null)
      .order('created_at', { ascending: false });

    if (unlinkedError) {
      logger.error(
        'SUBSCRIPTION_HEALTH',
        'Failed to fetch unlinked users',
        unlinkedError
      );
    }

    // Check for customers without corresponding profiles
    const { data: orphanedCustomers, error: orphanedError } = await supabase
      .from('customers')
      .select('customer_id, email, created_at')
      .order('created_at', { ascending: false });

    if (orphanedError) {
      logger.error(
        'SUBSCRIPTION_HEALTH',
        'Failed to fetch customers',
        orphanedError
      );
    }

    // Check for users with paddle_customer_id but no customer record
    const { data: mismatchedProfiles, error: mismatchedError } = await supabase
      .from('profiles')
      .select('id, email, paddle_customer_id, created_at')
      .not('paddle_customer_id', 'is', null)
      .order('created_at', { ascending: false });

    if (mismatchedError) {
      logger.error(
        'SUBSCRIPTION_HEALTH',
        'Failed to fetch profiles with paddle_customer_id',
        mismatchedError
      );
    }

    // Cross-reference to find profiles with paddle_customer_id but no customer record
    const profilesWithoutCustomerRecords =
      mismatchedProfiles?.filter(profile => {
        return !orphanedCustomers?.some(
          customer => customer.customer_id === profile.paddle_customer_id
        );
      }) || [];

    // Get current subscription statistics
    const { data: currentSubs, error: currentError } = await supabase
      .from('subscriptions')
      .select('tier_type, status, current')
      .eq('current', true);

    if (currentError) {
      logger.error(
        'SUBSCRIPTION_HEALTH',
        'Failed to fetch current subscriptions',
        currentError
      );
    }

    // Calculate statistics
    const subscriptionStats =
      currentSubs?.reduce((acc: any, sub: any) => {
        const key = `${sub.tier_type}_${sub.status}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}) || {};

    const healthData = {
      timestamp: new Date().toISOString(),
      summary: {
        pendingSubscriptions: pendingSubs?.length || 0,
        unlinkedUsers: unlinkedUsers?.length || 0,
        orphanedCustomers: orphanedCustomers?.length || 0,
        profilesWithoutCustomerRecords: profilesWithoutCustomerRecords.length,
        totalCurrentSubscriptions: currentSubs?.length || 0,
      },
      issues: {
        pendingSubscriptions:
          pendingSubs?.map(sub => ({
            id: sub.id,
            paddle_customer_id: sub.paddle_customer_id,
            status: sub.status,
            tier_type: sub.tier_type,
            created_at: sub.created_at,
          })) || [],
        unlinkedUsers:
          unlinkedUsers?.map(u => ({
            id: u.id,
            email: u.email,
            created_at: u.created_at,
          })) || [],
        profilesWithoutCustomerRecords: profilesWithoutCustomerRecords.map(
          p => ({
            id: p.id,
            email: p.email,
            paddle_customer_id: p.paddle_customer_id,
            created_at: p.created_at,
          })
        ),
      },
      subscriptionStats,
      recommendations: {
        immediate: [] as string[],
        monitoring: [] as string[],
      },
    };

    // Generate recommendations
    if (pendingSubs && pendingSubs.length > 0) {
      healthData.recommendations.immediate.push(
        `Found ${pendingSubs.length} pending subscriptions that need to be linked to users`
      );
    }

    if (unlinkedUsers && unlinkedUsers.length > 0) {
      healthData.recommendations.immediate.push(
        `Found ${unlinkedUsers.length} users without paddle_customer_id - customer webhooks may be missing`
      );
    }

    if (profilesWithoutCustomerRecords.length > 0) {
      healthData.recommendations.immediate.push(
        `Found ${profilesWithoutCustomerRecords.length} profiles with paddle_customer_id but no customer record - data inconsistency detected`
      );
    }

    if (pendingSubs && pendingSubs.length > 5) {
      healthData.recommendations.monitoring.push(
        'High number of pending subscriptions - consider implementing automatic recovery job'
      );
    }

    if (unlinkedUsers && unlinkedUsers.length > 10) {
      healthData.recommendations.monitoring.push(
        'High number of unlinked users - investigate customer webhook delivery'
      );
    }

    return NextResponse.json(healthData);
  } catch (error) {
    logger.error(
      'SUBSCRIPTION_HEALTH',
      'Health check failed',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      {
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
