import {
  CustomerCreatedEvent,
  CustomerUpdatedEvent,
  EventEntity,
  EventName,
  SubscriptionCreatedEvent,
  SubscriptionUpdatedEvent,
  TransactionCompletedEvent,
  TransactionPaidEvent,
  SubscriptionActivatedEvent,
} from '@paddle/paddle-node-sdk';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

// Cache price ID arrays at module level for performance
const CACHED_STARTER_PRICE_IDS = (() => {
  const envIds = process.env.PADDLE_STARTER_PRICE_IDS?.split(',') || [];
  const fallbackIds = [
    process.env.NEXT_PUBLIC_PADDLE_STARTER_MONTHLY_PRICE_ID,
    process.env.NEXT_PUBLIC_PADDLE_STARTER_ANNUAL_PRICE_ID,
    process.env.NEXT_PUBLIC_PADDLE_PRICE_ID, // legacy fallback
  ].filter(Boolean);
  return envIds.length > 0 ? envIds : fallbackIds;
})();

const CACHED_PRO_PRICE_IDS = (() => {
  const envIds = process.env.PADDLE_PRO_PRICE_IDS?.split(',') || [];
  const fallbackIds = [
    process.env.NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID,
    process.env.NEXT_PUBLIC_PADDLE_PRO_ANNUAL_PRICE_ID,
  ].filter(Boolean);
  return envIds.length > 0 ? envIds : fallbackIds;
})();

const CACHED_BUSINESS_PRICE_IDS =
  process.env.PADDLE_BUSINESS_PRICE_IDS?.split(',') || [];

export class ProcessWebhook {
  private getTierFromPriceId(priceId: string | null): string {
    if (!priceId) {
      return 'free';
    }

    if (CACHED_STARTER_PRICE_IDS.includes(priceId)) {
      return 'starter';
    }

    if (CACHED_PRO_PRICE_IDS.includes(priceId)) {
      return 'pro';
    }

    if (CACHED_BUSINESS_PRICE_IDS.includes(priceId)) {
      return 'business';
    }

    // If it's a paid price ID but not recognized, default to starter
    logger.warn(
      'PADDLE_WEBHOOK',
      'Unrecognized price_id, defaulting to starter tier',
      { priceId }
    );
    return 'starter';
  }

  async processEvent(eventData: EventEntity) {
    switch (eventData.eventType) {
      case EventName.SubscriptionCreated:
      case EventName.SubscriptionUpdated:
      case EventName.SubscriptionActivated:
        await this.updateSubscriptionData(eventData);
        break;
      case EventName.CustomerCreated:
      case EventName.CustomerUpdated:
        await this.updateCustomerData(eventData);
        break;
      case EventName.TransactionCompleted:
      case EventName.TransactionPaid:
        await this.handleTransactionEvent(eventData);
        break;
      default:
        logger.info('PADDLE_WEBHOOK', 'Unhandled event type', {
          eventType: eventData.eventType,
          eventId: eventData.eventId,
        });
    }
  }

  private async findUserBySubscriptionId(
    supabase: any,
    subscriptionId: string,
    paddleCustomerId: string
  ): Promise<string | null> {
    try {
      // First try to find existing subscription by exact ID match
      const { data: existingSubscription } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('id', subscriptionId)
        .maybeSingle();

      if (existingSubscription?.user_id) {
        return existingSubscription.user_id;
      }

      // If no exact match found, try to find user by customer ID directly from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('paddle_customer_id', paddleCustomerId)
        .maybeSingle();

      if (profile?.id) {
        logger.info(
          'PADDLE_WEBHOOK',
          'Found user by paddle_customer_id in profiles',
          {
            webhookSubscriptionId: subscriptionId,
            paddleCustomerId,
            userId: logger.maskUserId(profile.id),
          }
        );
        return profile.id;
      }

      // If still not found, try to find via customers table by email
      const { data: customer } = await supabase
        .from('customers')
        .select('email')
        .eq('customer_id', paddleCustomerId)
        .maybeSingle();

      if (customer?.email) {
        // Find user profile by email
        const { data: profileByEmail } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', customer.email)
          .maybeSingle();

        if (profileByEmail?.id) {
          logger.info(
            'PADDLE_WEBHOOK',
            'Found user by customer email lookup',
            {
              webhookSubscriptionId: subscriptionId,
              paddleCustomerId,
              customerEmail: logger.maskEmail(customer.email),
              userId: logger.maskUserId(profileByEmail.id),
            }
          );
          return profileByEmail.id;
        }
      }

      // Fallback: Try to find the most recent subscription for the specific Paddle customer
      const { data: recentSubscription } = await supabase
        .from('subscriptions')
        .select('user_id, id, created_at')
        .eq('paddle_customer_id', paddleCustomerId)
        .in('status', ['active', 'pending_webhook'])
        .order('created_at', { ascending: false })
        .limit(10); // Get recent subscriptions to find potential match

      if (recentSubscription && recentSubscription.length > 0) {
        logger.info(
          'PADDLE_WEBHOOK',
          'Using fallback user lookup for subscription ID mismatch',
          {
            webhookSubscriptionId: subscriptionId,
            paddleCustomerId,
            fallbackUserId: logger.maskUserId(recentSubscription[0].user_id),
            recentSubscriptionId: recentSubscription[0].id,
          }
        );
        return recentSubscription[0].user_id;
      }

      return null;
    } catch (error) {
      logger.error(
        'PADDLE_WEBHOOK',
        'Error finding user by subscription ID',
        error instanceof Error ? error : new Error(String(error)),
        { subscriptionId, paddleCustomerId }
      );
      return null;
    }
  }

  private async updateSubscriptionData(
    eventData:
      | SubscriptionCreatedEvent
      | SubscriptionUpdatedEvent
      | SubscriptionActivatedEvent
  ) {
    const supabase = createSupabaseAdmin();

    // Find user associated with this subscription
    const userId = await this.findUserBySubscriptionId(
      supabase,
      eventData.data.id,
      eventData.data.customerId
    );
    if (!userId) {
      logger.warn('PADDLE_WEBHOOK', 'No user found for subscription', {
        subscriptionId: eventData.data.id,
      });
      throw new Error('Subscription not found');
    }

    // Check if user already has a subscription (for subscription.created events)
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('id, status, tier_type')
      .eq('user_id', userId)
      .eq('current', true)
      .single();

    // Prepare subscription data for upsert
    const subscriptionUpsertData = {
      id: eventData.data.id,
      user_id: userId,
      status: eventData.data.status,
      price_id: eventData.data.items[0]?.price?.id || null,
      quantity: eventData.data.items[0]?.quantity || 1,
      cancel_at_period_end: !!eventData.data.canceledAt,
      current_period_start_at:
        eventData.data.currentBillingPeriod?.startsAt || null,
      current_period_end_at:
        eventData.data.currentBillingPeriod?.endsAt || null,
      ended_at: eventData.data.canceledAt || null,
      canceled_at: eventData.data.canceledAt || null,
      trial_start_at: null, // Will be set based on actual webhook data structure
      trial_end_at: null, // Will be set based on actual webhook data structure
      updated_at: new Date().toISOString(),
      tier_type: this.getTierFromPriceId(
        eventData.data.items[0]?.price?.id || null
      ),
      paddle_customer_id: eventData.data.customerId, // Store customer ID for billing operations
    };

    let result;

    if (
      existingSubscription &&
      eventData.eventType === 'subscription.created'
    ) {
      // If user has existing subscription and this is a creation event,
      // update the existing subscription with new Paddle data
      logger.info(
        'PADDLE_WEBHOOK',
        'Updating existing subscription with Paddle data',
        {
          userId: logger.maskUserId(userId),
          existingSubscriptionId: existingSubscription.id,
          newPaddleSubscriptionId: eventData.data.id,
          eventType: eventData.eventType,
        }
      );

      const { data: updateResult, error: updateError } = await supabase
        .from('subscriptions')
        .update({
          id: subscriptionUpsertData.id, // Update to Paddle's subscription ID
          price_id: subscriptionUpsertData.price_id,
          status: subscriptionUpsertData.status,
          tier_type: subscriptionUpsertData.tier_type,
          paddle_customer_id: subscriptionUpsertData.paddle_customer_id,
          current_period_start_at:
            subscriptionUpsertData.current_period_start_at,
          current_period_end_at: subscriptionUpsertData.current_period_end_at,
          updated_at: subscriptionUpsertData.updated_at,
        })
        .eq('user_id', userId)
        .eq('current', true)
        .select();

      if (updateError) {
        logger.error(
          'PADDLE_WEBHOOK',
          'Failed to update existing subscription',
          updateError,
          {
            userId: logger.maskUserId(userId),
            subscriptionId: eventData.data.id,
          }
        );
        throw updateError;
      }

      result = { success: true, operation: 'updated', data: updateResult };
    } else {
      // Use atomic upsert function for new subscriptions or updates
      const { data: upsertResult, error: upsertError } = await supabase.rpc(
        'upsert_subscription',
        {
          p_subscription_data: subscriptionUpsertData,
        }
      );

      if (upsertError) {
        logger.error(
          'PADDLE_WEBHOOK',
          'Failed to upsert subscription',
          upsertError,
          {
            userId: logger.maskUserId(userId),
            subscriptionId: eventData.data.id,
            eventType: eventData.eventType,
          }
        );
        throw upsertError;
      }

      result = upsertResult as any;
    }

    // Check if operation was successful
    if (!result?.success) {
      logger.error(
        'PADDLE_WEBHOOK',
        'Subscription operation returned error',
        new Error(result?.error || 'Unknown operation error'),
        {
          userId: logger.maskUserId(userId),
          subscriptionId: eventData.data.id,
          errorCode: result?.error_code,
        }
      );
      throw new Error('Subscription update failed');
    }

    logger.info('PADDLE_WEBHOOK', 'Subscription processed successfully', {
      userId: logger.maskUserId(userId),
      subscriptionId: eventData.data.id,
      eventType: eventData.eventType,
      operation: result.operation || 'upserted',
      status: eventData.data.status,
      tierType: this.getTierFromPriceId(
        eventData.data.items[0]?.price?.id || null
      ),
    });
  }

  private async updateCustomerData(
    eventData: CustomerCreatedEvent | CustomerUpdatedEvent
  ) {
    const supabase = createSupabaseAdmin();

    try {
      // First, upsert into customers table following starter kit pattern
      const { error: customerError } = await supabase.from('customers').upsert(
        {
          customer_id: eventData.data.id,
          email: eventData.data.email,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'customer_id',
        }
      );

      if (customerError) {
        logger.error(
          'PADDLE_WEBHOOK',
          'Failed to upsert customer data',
          customerError,
          {
            customerId: eventData.data.id,
            customerEmail: eventData.data.email,
          }
        );
        throw customerError;
      }

      // Also update profiles table with paddle_customer_id for direct reference
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ paddle_customer_id: eventData.data.id })
        .eq('email', eventData.data.email);

      if (profileError) {
        logger.warn(
          'PADDLE_WEBHOOK',
          'Failed to update profile with paddle_customer_id (non-critical)',
          {
            customerId: eventData.data.id,
            customerEmail: eventData.data.email,
            error: profileError.message,
          }
        );
        // Don't throw here as the main customers table update succeeded
      }

      logger.info('PADDLE_WEBHOOK', 'Customer data updated successfully', {
        customerId: eventData.data.id,
        customerEmail: eventData.data.email,
        profileUpdated: !profileError,
      });
    } catch (error) {
      logger.error(
        'PADDLE_WEBHOOK',
        'Failed to process customer webhook',
        error instanceof Error ? error : new Error(String(error)),
        {
          customerId: eventData.data.id,
          customerEmail: eventData.data.email,
        }
      );
      throw error;
    }
  }

  private async handleTransactionEvent(
    eventData: TransactionCompletedEvent | TransactionPaidEvent
  ) {
    const supabase = createSupabaseAdmin();

    try {
      logger.info('PADDLE_WEBHOOK', 'Processing transaction event', {
        eventType: eventData.eventType,
        transactionId: eventData.data.id,
        customerId: eventData.data.customerId,
        subscriptionId: eventData.data.subscriptionId,
        status: eventData.data.status,
      });

      // Find user associated with this transaction
      if (!eventData.data.customerId) {
        logger.warn('PADDLE_WEBHOOK', 'Transaction has no customer ID', {
          transactionId: eventData.data.id,
        });
        return; // Skip transactions without customer ID
      }

      const userId = await this.findUserByTransactionCustomerId(
        supabase,
        eventData.data.customerId
      );
      if (!userId) {
        logger.warn('PADDLE_WEBHOOK', 'No user found for transaction', {
          transactionId: eventData.data.id,
          customerId: eventData.data.customerId,
        });
        return; // Don't throw - transaction might be for a customer not in our system
      }

      // Note: Transaction data is now accessible via paddle.transactions foreign table
      // No need to store locally - we get real-time access via FDW

      // If this transaction is for a subscription, we'll let the subscription events handle tier updates
      if (eventData.data.subscriptionId) {
        logger.info(
          'PADDLE_WEBHOOK',
          'Transaction is for subscription - tier managed via subscription events',
          {
            transactionId: eventData.data.id,
            subscriptionId: eventData.data.subscriptionId,
          }
        );
        return;
      }

      // For one-time purchases or non-subscription transactions, you might want to handle differently
      // For now, we'll just log them for reference
      logger.info('PADDLE_WEBHOOK', 'Non-subscription transaction processed', {
        transactionId: eventData.data.id,
        customerId: eventData.data.customerId,
        amount: eventData.data.details?.totals?.total,
        currency: eventData.data.currencyCode,
      });
    } catch (error) {
      logger.error(
        'PADDLE_WEBHOOK',
        'Failed to process transaction webhook',
        error instanceof Error ? error : new Error(String(error)),
        {
          transactionId: eventData.data.id,
          customerId: eventData.data.customerId,
          subscriptionId: eventData.data.subscriptionId,
        }
      );
      throw error;
    }
  }

  private async findUserByTransactionCustomerId(
    supabase: any,
    customerId: string
  ): Promise<string | null> {
    try {
      // First check if customer exists in our customers table
      const { data: customer } = await supabase
        .from('customers')
        .select('email')
        .eq('customer_id', customerId)
        .single();

      if (customer?.email) {
        // Find user by email
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', customer.email)
          .single();

        return profile?.id || null;
      }

      // Fallback: check profiles table directly for paddle_customer_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('paddle_customer_id', customerId)
        .single();

      return profile?.id || null;
    } catch (error) {
      logger.error(
        'PADDLE_WEBHOOK',
        'Error finding user for transaction customer',
        error instanceof Error ? error : new Error(String(error)),
        { customerId }
      );
      return null;
    }
  }
}
