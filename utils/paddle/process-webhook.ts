import {
  CustomerCreatedEvent,
  CustomerUpdatedEvent,
  EventEntity,
  EventName,
  SubscriptionCreatedEvent,
  SubscriptionUpdatedEvent,
} from '@paddle/paddle-node-sdk';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

export class ProcessWebhook {
  private getTierFromPriceId(priceId: string | null): string {
    if (!priceId) {
      return 'free';
    }

    // Get price ID mappings from environment variables
    const STARTER_PRICE_IDS = process.env.PADDLE_STARTER_PRICE_IDS?.split(',') || [
      process.env.NEXT_PUBLIC_PADDLE_STARTER_MONTHLY_PRICE_ID,
      process.env.NEXT_PUBLIC_PADDLE_STARTER_ANNUAL_PRICE_ID,
      process.env.NEXT_PUBLIC_PADDLE_PRICE_ID, // legacy fallback
    ].filter(Boolean);

    const PRO_PRICE_IDS = process.env.PADDLE_PRO_PRICE_IDS?.split(',') || [
      process.env.NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID,
      process.env.NEXT_PUBLIC_PADDLE_PRO_ANNUAL_PRICE_ID,
    ].filter(Boolean);

    const BUSINESS_PRICE_IDS = process.env.PADDLE_BUSINESS_PRICE_IDS?.split(',') || [];

    if (STARTER_PRICE_IDS.includes(priceId)) {
      return 'starter';
    }

    if (PRO_PRICE_IDS.includes(priceId)) {
      return 'pro';
    }

    if (BUSINESS_PRICE_IDS.includes(priceId)) {
      return 'business';
    }

    // If it's a paid price ID but not recognized, default to starter
    logger.warn('PADDLE_WEBHOOK', 'Unrecognized price_id, defaulting to starter tier', { priceId });
    return 'starter';
  }

  async processEvent(eventData: EventEntity) {
    switch (eventData.eventType) {
      case EventName.SubscriptionCreated:
      case EventName.SubscriptionUpdated:
        await this.updateSubscriptionData(eventData);
        break;
      case EventName.CustomerCreated:
      case EventName.CustomerUpdated:
        await this.updateCustomerData(eventData);
        break;
    }
  }

  private async findUserBySubscriptionId(
    supabase: any,
    subscriptionId: string
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

      // If no exact match found, we might have an ID mismatch between success callback and webhook
      // Try to find the most recent subscription for any user that might be pending webhook confirmation
      const { data: recentSubscription } = await supabase
        .from('subscriptions')
        .select('user_id, id, created_at')
        .in('status', ['active', 'pending_webhook'])
        .order('created_at', { ascending: false })
        .limit(10); // Get recent subscriptions to find potential match

      if (recentSubscription && recentSubscription.length > 0) {
        logger.info(
          'PADDLE_WEBHOOK',
          'Using fallback user lookup for subscription ID mismatch',
          {
            webhookSubscriptionId: subscriptionId,
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
        { subscriptionId }
      );
      return null;
    }
  }

  private async updateSubscriptionData(eventData: SubscriptionCreatedEvent | SubscriptionUpdatedEvent) {
    const supabase = createSupabaseAdmin();
    
    // Find user associated with this subscription
    const userId = await this.findUserBySubscriptionId(supabase, eventData.data.id);
    if (!userId) {
      logger.warn('PADDLE_WEBHOOK', 'No user found for subscription', {
        subscriptionId: eventData.data.id,
      });
      throw new Error('Subscription not found');
    }
    
    // Prepare subscription data for upsert
    const subscriptionUpsertData = {
      id: eventData.data.id,
      user_id: userId,
      status: eventData.data.status,
      price_id: eventData.data.items[0]?.price?.id || null,
      quantity: eventData.data.items[0]?.quantity || 1,
      cancel_at_period_end: eventData.data.canceledAt ? true : false,
      current_period_start_at: eventData.data.currentBillingPeriod?.startsAt || null,
      current_period_end_at: eventData.data.currentBillingPeriod?.endsAt || null,
      ended_at: eventData.data.canceledAt || null,
      canceled_at: eventData.data.canceledAt || null,
      trial_start_at: null, // Will be set based on actual webhook data structure
      trial_end_at: null, // Will be set based on actual webhook data structure
      updated_at: new Date().toISOString(),
      tier_type: this.getTierFromPriceId(eventData.data.items[0]?.price?.id || null),
      paddle_customer_id: eventData.data.customerId, // Store customer ID for billing operations
    };

    // Use atomic upsert function to handle webhook updates
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

    // Check if upsert was successful
    const result = upsertResult as any;
    if (!result?.success) {
      logger.error(
        'PADDLE_WEBHOOK',
        'Subscription upsert returned error',
        new Error(result?.error || 'Unknown upsert error'),
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
      operation: result.operation,
      status: eventData.data.status,
    });

    // Trigger Twilio number deletion if subscription is canceled or past_due
    if (
      eventData.data.status === 'canceled' ||
      eventData.data.status === 'past_due'
    ) {
      try {
        const { deleteTwilioNumberForUser } = await import(
          '@/lib/actions/assistant.actions'
        );
        deleteTwilioNumberForUser(userId).catch(deleteError => {
          logger.error(
            'PADDLE_WEBHOOK',
            'Failed to delete Twilio number after subscription cancellation',
            deleteError instanceof Error
              ? deleteError
              : new Error(String(deleteError)),
            {
              userId: logger.maskUserId(userId),
              subscriptionId: eventData.data.id,
            }
          );
        });
        logger.info('PADDLE_WEBHOOK', 'Twilio number deletion triggered', {
          userId: logger.maskUserId(userId),
          subscriptionId: eventData.data.id,
        });
      } catch (importError) {
        logger.error(
          'PADDLE_WEBHOOK',
          'Failed to import Twilio number deletion function',
          importError instanceof Error
            ? importError
            : new Error(String(importError)),
          {
            userId: logger.maskUserId(userId),
            subscriptionId: eventData.data.id,
          }
        );
      }
    }

    return upsertResult;
  }

  private async updateCustomerData(eventData: CustomerCreatedEvent | CustomerUpdatedEvent) {
    const supabase = createSupabaseAdmin();
    
    try {
      // First, upsert into customers table following starter kit pattern
      const { error: customerError } = await supabase
        .from('customers')
        .upsert({
          customer_id: eventData.data.id,
          email: eventData.data.email,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'customer_id'
        });

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
} 