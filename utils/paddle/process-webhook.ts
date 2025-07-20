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
      // Handle subscription lifecycle events that affect access
      case 'subscription.canceled':
      case 'subscription.paused':
      case 'subscription.past_due':
      case 'subscription.resumed':
        await this.handleSubscriptionStatusChange(eventData);
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
          logger.info('PADDLE_WEBHOOK', 'Found user by customer email lookup', {
            webhookSubscriptionId: subscriptionId,
            paddleCustomerId,
            customerEmail: logger.maskEmail(customer.email),
            userId: logger.maskUserId(profileByEmail.id),
          });
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
      (eventData.eventType === 'subscription.created' ||
        (eventData.eventType === 'subscription.updated' &&
          existingSubscription.id !== eventData.data.id))
    ) {
      // If user has existing subscription and either:
      // 1. This is a creation event, OR
      // 2. This is an update event but subscription IDs don't match
      // Then delete the old subscription and insert the new Paddle subscription
      logger.info(
        'PADDLE_WEBHOOK',
        'Replacing existing subscription with Paddle data',
        {
          userId: logger.maskUserId(userId),
          existingSubscriptionId: existingSubscription.id,
          newPaddleSubscriptionId: eventData.data.id,
          eventType: eventData.eventType,
        }
      );

      // First, delete the old subscription record
      const { error: deleteError } = await supabase
        .from('subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('current', true);

      if (deleteError) {
        logger.error(
          'PADDLE_WEBHOOK',
          'Failed to delete existing subscription',
          deleteError,
          {
            userId: logger.maskUserId(userId),
            existingSubscriptionId: existingSubscription.id,
          }
        );
        throw deleteError;
      }

      // Now insert the new subscription with Paddle data
      const { data: insertResult, error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          ...subscriptionUpsertData,
          current: true,
        })
        .select();

      if (insertError) {
        logger.error(
          'PADDLE_WEBHOOK',
          'Failed to insert new subscription',
          insertError,
          {
            userId: logger.maskUserId(userId),
            subscriptionId: eventData.data.id,
          }
        );
        throw insertError;
      }

      result = { success: true, operation: 'replaced', data: insertResult };
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

  private async handleSubscriptionStatusChange(eventData: EventEntity) {
    const supabase = createSupabaseAdmin();

    try {
      // Type guard to ensure we're dealing with subscription data
      const subscriptionData = eventData.data as any; // Type assertion for subscription events

      logger.info('PADDLE_WEBHOOK', 'Processing subscription status change', {
        eventType: eventData.eventType,
        subscriptionId: subscriptionData.id,
        status: subscriptionData.status,
      });

      // Find user associated with this subscription
      const userId = await this.findUserBySubscriptionId(
        supabase,
        subscriptionData.id,
        subscriptionData.customerId
      );

      if (!userId) {
        logger.warn(
          'PADDLE_WEBHOOK',
          'No user found for subscription status change',
          {
            subscriptionId: subscriptionData.id,
            eventType: eventData.eventType,
          }
        );
        return; // Don't throw - this might be a subscription not in our system
      }

      // Determine the appropriate tier based on subscription status
      let newTierType = 'free';
      let newStatus = subscriptionData.status || 'canceled';

      // For canceled, paused, past_due subscriptions, revert to free tier
      if (
        [
          'subscription.canceled',
          'subscription.paused',
          'subscription.past_due',
        ].includes(eventData.eventType)
      ) {
        newTierType = 'free';
        newStatus =
          eventData.eventType === 'subscription.canceled'
            ? 'canceled'
            : subscriptionData.status || 'canceled';
      } else if (
        eventData.eventType === 'subscription.resumed' &&
        subscriptionData.status === 'active'
      ) {
        // For resumed subscriptions, determine tier from price ID
        const priceId = subscriptionData.items?.[0]?.price?.id || null;
        newTierType = this.getTierFromPriceId(priceId);
        newStatus = 'active';
      }

      // Prepare subscription data for update
      const subscriptionUpdateData = {
        id: subscriptionData.id,
        user_id: userId,
        status: newStatus,
        tier_type: newTierType,
        price_id: subscriptionData.items?.[0]?.price?.id || null,
        quantity: subscriptionData.items?.[0]?.quantity || 1,
        cancel_at_period_end: !!subscriptionData.canceledAt,
        current_period_start_at:
          subscriptionData.currentBillingPeriod?.startsAt || null,
        current_period_end_at:
          subscriptionData.currentBillingPeriod?.endsAt || null,
        ended_at: subscriptionData.canceledAt || null,
        canceled_at: subscriptionData.canceledAt || null,
        updated_at: new Date().toISOString(),
        paddle_customer_id: subscriptionData.customerId,
      };

      // For cancellations/expirations, we want to ensure the user gets reverted to free access
      if (newTierType === 'free') {
        logger.info(
          'PADDLE_WEBHOOK',
          'Reverting user to free tier due to subscription status change',
          {
            userId: logger.maskUserId(userId),
            subscriptionId: subscriptionData.id,
            eventType: eventData.eventType,
            newStatus: newStatus,
          }
        );

        // First update the current subscription to reflect the status change
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            ...subscriptionUpdateData,
            current: false, // Mark as not current
          })
          .eq('id', subscriptionData.id);

        if (updateError) {
          logger.error(
            'PADDLE_WEBHOOK',
            'Failed to update subscription status',
            updateError,
            {
              userId: logger.maskUserId(userId),
              subscriptionId: subscriptionData.id,
            }
          );
          throw updateError;
        }

        // Create a new free subscription if one doesn't exist
        const { data: existingFreeSubscription } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', userId)
          .eq('tier_type', 'free')
          .eq('current', true)
          .maybeSingle();

        if (!existingFreeSubscription) {
          const { error: insertError } = await supabase
            .from('subscriptions')
            .insert({
              id: `free_${Date.now()}_${userId.substring(0, 8)}`,
              user_id: userId,
              status: 'active',
              tier_type: 'free',
              current: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (insertError) {
            logger.error(
              'PADDLE_WEBHOOK',
              'Failed to create free subscription',
              insertError,
              {
                userId: logger.maskUserId(userId),
              }
            );
            throw insertError;
          }

          logger.info('PADDLE_WEBHOOK', 'Created free subscription for user', {
            userId: logger.maskUserId(userId),
          });
        }
      } else {
        // For resumptions, use the standard upsert flow
        const { data: upsertResult, error: upsertError } = await supabase.rpc(
          'upsert_subscription',
          {
            p_subscription_data: subscriptionUpdateData,
          }
        );

        if (upsertError) {
          logger.error(
            'PADDLE_WEBHOOK',
            'Failed to upsert resumed subscription',
            upsertError,
            {
              userId: logger.maskUserId(userId),
              subscriptionId: subscriptionData.id,
            }
          );
          throw upsertError;
        }

        logger.info(
          'PADDLE_WEBHOOK',
          'Resumed subscription processed successfully',
          {
            userId: logger.maskUserId(userId),
            subscriptionId: subscriptionData.id,
            newTierType,
          }
        );
      }

      logger.info(
        'PADDLE_WEBHOOK',
        'Subscription status change processed successfully',
        {
          userId: logger.maskUserId(userId),
          subscriptionId: subscriptionData.id,
          eventType: eventData.eventType,
          newTierType,
          newStatus,
        }
      );
    } catch (error) {
      logger.error(
        'PADDLE_WEBHOOK',
        'Failed to process subscription status change',
        error instanceof Error ? error : new Error(String(error)),
        {
          subscriptionId: (eventData.data as any).id,
          eventType: eventData.eventType,
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
