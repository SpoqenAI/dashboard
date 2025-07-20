import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { SupabaseClient } from '@supabase/supabase-js';

// Subscription interface for type safety
interface Subscription {
  id: string;
  paddle_customer_id: string | null;
  created_at: string;
  status: string;
  tier_type: string;
  price_id: string | null;
  quantity?: number;
  cancel_at_period_end?: boolean | null;
  current_period_start_at?: string | null;
  current_period_end_at?: string | null;
  ended_at?: string | null;
  canceled_at?: string | null;
  trial_start_at?: string | null;
  trial_end_at?: string | null;
  updated_at?: string;
  user_id?: string | null;
  current?: boolean;
}

/**
 * Automatic recovery job to fix subscription linking issues
 * This job processes pending subscriptions and links them to users
 */
export async function recoverSubscriptionLinking() {
  const supabase = createSupabaseAdmin();

  try {
    logger.info('RECOVERY_JOB', 'Starting subscription linking recovery job');

    // Find all pending subscriptions
    const { data: pendingSubs, error: pendingError } = await supabase
      .from('subscriptions')
      .select('id, paddle_customer_id, created_at, status, tier_type, price_id')
      .is('user_id', null)
      .order('created_at', { ascending: true });

    if (pendingError) {
      logger.error(
        'RECOVERY_JOB',
        'Failed to fetch pending subscriptions',
        pendingError
      );
      throw pendingError;
    }

    if (!pendingSubs || pendingSubs.length === 0) {
      logger.info('RECOVERY_JOB', 'No pending subscriptions found');
      return { processed: 0, errors: 0 };
    }

    logger.info(
      'RECOVERY_JOB',
      `Found ${pendingSubs.length} pending subscriptions to process`
    );

    let processed = 0;
    let errors = 0;

    for (const subscription of pendingSubs) {
      try {
        // Try to find user by customer ID
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('email')
          .eq('customer_id', subscription.paddle_customer_id)
          .single();

        if (customerError || !customer?.email) {
          logger.warn(
            'RECOVERY_JOB',
            'No customer record found for subscription',
            {
              subscriptionId: subscription.id,
              paddleCustomerId: subscription.paddle_customer_id,
            }
          );
          errors++;
          continue;
        }

        // Find user profile by email
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('email', customer.email)
          .single();

        if (profileError || !profile?.id) {
          logger.warn(
            'RECOVERY_JOB',
            'No user profile found for customer email',
            {
              subscriptionId: subscription.id,
              customerEmail: logger.maskEmail(customer.email),
              paddleCustomerId: subscription.paddle_customer_id,
            }
          );
          errors++;
          continue;
        }

        // Link subscription to user
        await linkPendingSubscriptionToUser(supabase, subscription, profile.id);
        processed++;

        logger.info(
          'RECOVERY_JOB',
          'Successfully linked pending subscription',
          {
            subscriptionId: subscription.id,
            userId: logger.maskUserId(profile.id),
            customerEmail: logger.maskEmail(customer.email),
          }
        );
      } catch (subscriptionError) {
        logger.error(
          'RECOVERY_JOB',
          'Error processing subscription',
          subscriptionError instanceof Error
            ? subscriptionError
            : new Error(String(subscriptionError)),
          { subscriptionId: subscription.id }
        );
        errors++;
      }
    }

    logger.info('RECOVERY_JOB', 'Recovery job completed', {
      processed,
      errors,
      total: pendingSubs.length,
    });

    return { processed, errors, total: pendingSubs.length };
  } catch (error) {
    logger.error(
      'RECOVERY_JOB',
      'Recovery job failed',
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}

/**
 * Helper function to link a pending subscription to a user
 */
async function linkPendingSubscriptionToUser(
  supabase: SupabaseClient,
  subscription: Subscription,
  userId: string
) {
  try {
    // Remove existing free subscription
    const { error: deleteError } = await supabase
      .from('subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('tier_type', 'free');

    if (deleteError) {
      logger.warn(
        'RECOVERY_JOB',
        'Failed to delete existing free subscription',
        deleteError
      );
    }

    // Update the pending subscription to link it to the user
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        user_id: userId,
        current: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id);

    if (updateError) {
      logger.error(
        'RECOVERY_JOB',
        'Failed to link subscription to user',
        updateError,
        {
          subscriptionId: subscription.id,
          userId: logger.maskUserId(userId),
        }
      );
      throw updateError;
    }

    // Also update the user's profile with paddle_customer_id if not already set
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ paddle_customer_id: subscription.paddle_customer_id })
      .eq('id', userId)
      .is('paddle_customer_id', null);

    if (profileError) {
      logger.warn(
        'RECOVERY_JOB',
        'Failed to update profile with paddle_customer_id',
        profileError
      );
    }
  } catch (error) {
    logger.error(
      'RECOVERY_JOB',
      'Error linking subscription to user',
      error instanceof Error ? error : new Error(String(error)),
      { subscriptionId: subscription.id, userId: logger.maskUserId(userId) }
    );
    throw error;
  }
}

/**
 * Manual recovery function for specific user email
 */
export async function recoverUserSubscription(userEmail: string) {
  const supabase = createSupabaseAdmin();

  try {
    logger.info('RECOVERY_JOB', 'Starting manual recovery for user', {
      userEmail: logger.maskEmail(userEmail),
    });

    // Find user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, paddle_customer_id')
      .eq('email', userEmail)
      .single();

    if (profileError || !profile?.id) {
      throw new Error(`User profile not found for email: ${userEmail}`);
    }

    // If user already has paddle_customer_id, find pending subscriptions
    if (profile.paddle_customer_id) {
      const { data: pendingSubs } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('paddle_customer_id', profile.paddle_customer_id)
        .is('user_id', null);

      if (pendingSubs && pendingSubs.length > 0) {
        for (const subscription of pendingSubs) {
          await linkPendingSubscriptionToUser(
            supabase,
            subscription,
            profile.id
          );
        }
        return {
          success: true,
          message: `Linked ${pendingSubs.length} pending subscriptions`,
        };
      }
    }

    // If no paddle_customer_id, try to find customer record
    const { data: customer } = await supabase
      .from('customers')
      .select('customer_id, email')
      .eq('email', userEmail)
      .single();

    if (customer?.customer_id) {
      // Update profile with paddle_customer_id
      await supabase
        .from('profiles')
        .update({ paddle_customer_id: customer.customer_id })
        .eq('id', profile.id);

      // Find and link pending subscriptions
      const { data: pendingSubs } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('paddle_customer_id', customer.customer_id)
        .is('user_id', null);

      if (pendingSubs && pendingSubs.length > 0) {
        for (const subscription of pendingSubs) {
          await linkPendingSubscriptionToUser(
            supabase,
            subscription,
            profile.id
          );
        }
        return {
          success: true,
          message: `Linked ${pendingSubs.length} pending subscriptions`,
        };
      }
    }

    return {
      success: false,
      message: 'No pending subscriptions found for user',
    };
  } catch (error) {
    logger.error(
      'RECOVERY_JOB',
      'Manual recovery failed',
      error instanceof Error ? error : new Error(String(error)),
      { userEmail: logger.maskEmail(userEmail) }
    );
    throw error;
  }
}
