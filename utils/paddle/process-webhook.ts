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
import { SupabaseClient } from '@supabase/supabase-js';

// Constants
const THIRTY_DAYS_IN_MS = 30 * 24 * 60 * 60 * 1000;

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

// Price ID arrays are now dynamically loaded at runtime to ensure environment variables are available

export class ProcessWebhook {
  private getStarterPriceIds(): string[] {
    const envIds = process.env.PADDLE_STARTER_PRICE_IDS?.split(',') || [];
    const fallbackIds = [
      process.env.NEXT_PUBLIC_PADDLE_STARTER_MONTHLY_PRICE_ID,
      process.env.NEXT_PUBLIC_PADDLE_STARTER_ANNUAL_PRICE_ID,
      process.env.NEXT_PUBLIC_PADDLE_PRICE_ID, // legacy fallback
    ].filter(Boolean) as string[];
    return envIds.length > 0 ? envIds : fallbackIds;
  }

  private getProPriceIds(): string[] {
    const envIds = process.env.PADDLE_PRO_PRICE_IDS?.split(',') || [];
    const fallbackIds = [
      process.env.NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID,
      process.env.NEXT_PUBLIC_PADDLE_PRO_ANNUAL_PRICE_ID,
    ].filter(Boolean) as string[];
    return envIds.length > 0 ? envIds : fallbackIds;
  }

  private getBusinessPriceIds(): string[] {
    return process.env.PADDLE_BUSINESS_PRICE_IDS?.split(',') || [];
  }

  private async hasActivePhone(
    supabase: SupabaseClient,
    userId: string
  ): Promise<boolean> {
    const { data: existingPhone } = await supabase
      .from('phone_numbers')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();
    return !!existingPhone;
  }

  private triggerProvision(
    supabase: SupabaseClient,
    params: {
      userId: string;
      tierType: string;
      status: string;
      triggerAction: 'subscription_activated' | 'subscription_resumed';
      subscriptionId: string;
    }
  ): void {
    const { userId, tierType, status, triggerAction, subscriptionId } = params;

    logger.info('PHONE_PROVISION', 'Invoking phone-number-provision', {
      userId: logger.maskUserId(userId),
      subscriptionId,
      tierType,
      status,
      triggerAction,
    });

    supabase.functions
      .invoke('phone-number-provision', {
        body: {
          user_id: userId,
          tier_type: tierType,
          subscription_status: status,
          trigger_action: triggerAction,
          timestamp: new Date().toISOString(),
          subscription_id: subscriptionId,
        },
      })
      .then(({ error }) => {
        if (error) {
          logger.error(
            'PHONE_PROVISION',
            'Provisioning function invocation failed',
            error,
            { userId: logger.maskUserId(userId), subscriptionId }
          );
        } else {
          logger.info('PHONE_PROVISION', 'Provisioning function invoked', {
            userId: logger.maskUserId(userId),
            subscriptionId,
          });
        }
      })
      .catch(err => {
        logger.error(
          'PHONE_PROVISION',
          'Provisioning function invocation threw error',
          err instanceof Error ? err : new Error(String(err)),
          { userId: logger.maskUserId(userId), subscriptionId }
        );
      });
  }

  private getTierFromPriceId(priceId: string | null): string {
    if (!priceId) {
      return 'free';
    }

    if (this.getStarterPriceIds().includes(priceId)) {
      return 'starter';
    }

    if (this.getProPriceIds().includes(priceId)) {
      return 'pro';
    }

    if (this.getBusinessPriceIds().includes(priceId)) {
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

  /**
   * Helper method to create subscription data object from webhook event
   */
  private createSubscriptionData(
    eventData:
      | SubscriptionCreatedEvent
      | SubscriptionUpdatedEvent
      | SubscriptionActivatedEvent,
    userId: string | null = null
  ) {
    return {
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
      trial_start_at: null,
      trial_end_at: null,
      updated_at: new Date().toISOString(),
      tier_type: this.getTierFromPriceId(
        eventData.data.items[0]?.price?.id || null
      ),
      paddle_customer_id: eventData.data.customerId,
    } as any; // Type assertion to allow property deletion
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
    supabase: SupabaseClient,
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
        .in('status', ['active', 'trialing'])
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
      // For subscription.created events, store the subscription with null user_id
      // so it can be processed later when the user profile is created
      if (eventData.eventType === EventName.SubscriptionCreated) {
        logger.info(
          'PADDLE_WEBHOOK',
          'Storing pending subscription for later processing',
          {
            subscriptionId: eventData.data.id,
            customerId: eventData.data.customerId,
            eventType: eventData.eventType,
          }
        );

        // Store subscription with null user_id for later processing
        const pendingSubscriptionData = this.createSubscriptionData(
          eventData,
          null
        );

        // Insert the pending subscription
        const { error: insertError } = await supabase
          .from('subscriptions')
          .insert(pendingSubscriptionData);

        if (insertError) {
          logger.error(
            'PADDLE_WEBHOOK',
            'Failed to store pending subscription',
            insertError,
            {
              subscriptionId: eventData.data.id,
              customerId: eventData.data.customerId,
            }
          );
          throw insertError;
        }

        logger.info(
          'PADDLE_WEBHOOK',
          'Pending subscription stored successfully',
          {
            subscriptionId: eventData.data.id,
            customerId: eventData.data.customerId,
          }
        );
        return; // Skip further processing for now
      } else {
        // For subscription.activated and subscription.updated events,
        // update the existing pending subscription if it exists
        logger.info(
          'PADDLE_WEBHOOK',
          'Updating pending subscription without user',
          {
            subscriptionId: eventData.data.id,
            customerId: eventData.data.customerId,
            eventType: eventData.eventType,
          }
        );

        // Update the existing subscription record
        const updateData = this.createSubscriptionData(eventData);
        // Remove user_id and paddle_customer_id for update operation
        delete updateData.user_id;
        delete updateData.paddle_customer_id;

        const { error: updateError } = await supabase
          .from('subscriptions')
          .update(updateData)
          .eq('id', eventData.data.id);

        if (updateError) {
          logger.error(
            'PADDLE_WEBHOOK',
            'Failed to update pending subscription',
            updateError,
            {
              subscriptionId: eventData.data.id,
              customerId: eventData.data.customerId,
            }
          );
          throw updateError;
        }

        logger.info(
          'PADDLE_WEBHOOK',
          'Pending subscription updated successfully',
          {
            subscriptionId: eventData.data.id,
            customerId: eventData.data.customerId,
            eventType: eventData.eventType,
          }
        );
        return; // Skip further processing for now
      }
    }

    // Check if user already has a subscription (for subscription.created events)
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('id, status, tier_type')
      .eq('user_id', userId)
      .eq('current', true)
      .single();

    // Prepare subscription data for upsert
    const subscriptionUpsertData = this.createSubscriptionData(
      eventData,
      userId
    );

    // Use atomic upsert function for all subscription operations
    // This ensures atomicity and prevents partial updates
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

    const result = upsertResult as any;

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

    // Trigger phone-number provisioning when a user's subscription is paid and active
    try {
      const newStatus = eventData.data.status;
      const newTierType = this.getTierFromPriceId(
        eventData.data.items[0]?.price?.id || null
      );

      // Only consider provisioning for paid, active subscriptions
      if (newStatus === 'active' && newTierType !== 'free') {
        // Fire only for initial activation to avoid duplicate invokes from SubscriptionUpdated
        if (eventData.eventType !== EventName.SubscriptionActivated) {
          logger.info(
            'PHONE_PROVISION',
            'Skip provisioning on non-activated event',
            {
              eventType: eventData.eventType,
              subscriptionId: eventData.data.id,
              status: newStatus,
              tierType: newTierType,
            }
          );
          return;
        }
        // Guard: Skip if user already has an active phone number
        if (!(await this.hasActivePhone(supabase, userId))) {
          logger.info(
            'PADDLE_WEBHOOK',
            'Triggering phone-number provisioning for paid subscription',
            {
              userId: logger.maskUserId(userId),
              subscriptionId: eventData.data.id,
              tierType: newTierType,
              status: newStatus,
            }
          );
          this.triggerProvision(supabase, {
            userId,
            tierType: newTierType,
            status: newStatus,
            triggerAction: 'subscription_activated',
            subscriptionId: eventData.data.id,
          });
        } else {
          logger.info(
            'PHONE_PROVISION',
            'Active phone already exists; skipping',
            {
              userId: logger.maskUserId(userId),
              subscriptionId: eventData.data.id,
            }
          );
        }
      } else {
        logger.info(
          'PHONE_PROVISION',
          'Subscription not eligible for provisioning',
          {
            userId: logger.maskUserId(userId),
            subscriptionId: eventData.data.id,
            status: newStatus,
            tierType: newTierType,
          }
        );
      }
    } catch (provErr) {
      logger.error(
        'PHONE_PROVISION',
        'Error during provisioning trigger logic',
        provErr instanceof Error ? provErr : new Error(String(provErr)),
        {
          userId: logger.maskUserId(userId),
          subscriptionId: eventData.data.id,
        }
      );
      // Do not throw; webhook flow must complete regardless
    }
  }

  private async updateCustomerData(
    eventData: CustomerCreatedEvent | CustomerUpdatedEvent
  ) {
    const supabase = createSupabaseAdmin();

    try {
      logger.info('PADDLE_WEBHOOK', 'Processing customer webhook', {
        eventType: eventData.eventType,
        customerId: eventData.data.id,
        customerEmail: logger.maskEmail(eventData.data.email),
      });

      // 1. Upsert customer record
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
            customerEmail: logger.maskEmail(eventData.data.email),
          }
        );
        throw customerError;
      }

      // 2. Update ALL profiles with this email (not just first match)
      const { data: updatedProfiles, error: profileError } = await supabase
        .from('profiles')
        .update({ paddle_customer_id: eventData.data.id })
        .eq('email', eventData.data.email)
        .select('id, email');

      if (profileError) {
        logger.warn(
          'PADDLE_WEBHOOK',
          'Failed to update profile with paddle_customer_id (non-critical)',
          profileError
        );
        // Don't throw - this is non-critical and we'll retry
      } else {
        logger.info(
          'PADDLE_WEBHOOK',
          'Updated profiles with paddle_customer_id',
          {
            customerId: eventData.data.id,
            customerEmail: logger.maskEmail(eventData.data.email),
            updatedCount: updatedProfiles?.length || 0,
          }
        );
      }

      // 3. Process pending subscriptions for this customer
      await this.processPendingSubscriptionsForCustomer(
        supabase,
        eventData.data.id,
        eventData.data.email
      );

      // 4. Add retry mechanism for failed profile updates
      if (profileError) {
        logger.info('PADDLE_WEBHOOK', 'Scheduling retry for profile update', {
          customerId: eventData.data.id,
          customerEmail: logger.maskEmail(eventData.data.email),
        });

        // Implement immediate retry with exponential backoff
        await this.retryProfileUpdate(
          supabase,
          eventData.data.id,
          eventData.data.email
        );
      }

      logger.info('PADDLE_WEBHOOK', 'Customer data updated successfully', {
        customerId: eventData.data.id,
        customerEmail: logger.maskEmail(eventData.data.email),
        eventType: eventData.eventType,
      });
    } catch (error) {
      logger.error(
        'PADDLE_WEBHOOK',
        'Failed to process customer webhook',
        error instanceof Error ? error : new Error(String(error)),
        {
          customerId: eventData.data.id,
          customerEmail: logger.maskEmail(eventData.data.email),
        }
      );
      throw error;
    }
  }

  /**
   * Process any pending subscriptions for a customer when their profile is created
   */
  private async processPendingSubscriptionsForCustomer(
    supabase: SupabaseClient,
    customerId: string,
    customerEmail: string
  ) {
    try {
      logger.info(
        'PADDLE_WEBHOOK',
        'Processing pending subscriptions for customer',
        {
          customerId,
          customerEmail: logger.maskEmail(customerEmail),
        }
      );

      // 1. Find user profile by email (more robust)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', customerEmail);

      if (!profiles || profiles.length === 0) {
        logger.warn('PADDLE_WEBHOOK', 'No user profile found for customer', {
          customerId,
          customerEmail: logger.maskEmail(customerEmail),
        });
        return;
      }

      // 2. Process for all matching profiles (handle edge cases)
      for (const profile of profiles) {
        await this.linkPendingSubscriptionsToUser(
          supabase,
          customerId,
          profile.id
        );
      }
    } catch (error) {
      logger.error(
        'PADDLE_WEBHOOK',
        'Error processing pending subscriptions for customer',
        error instanceof Error ? error : new Error(String(error)),
        {
          customerId,
          customerEmail: logger.maskEmail(customerEmail),
        }
      );
    }
  }

  private async linkPendingSubscriptionsToUser(
    supabase: SupabaseClient,
    customerId: string,
    userId: string
  ) {
    try {
      // 1. Find pending subscriptions
      const { data: pendingSubscriptions } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('paddle_customer_id', customerId)
        .is('user_id', null)
        .order('created_at', { ascending: true });

      if (!pendingSubscriptions || pendingSubscriptions.length === 0) {
        logger.info(
          'PADDLE_WEBHOOK',
          'No pending subscriptions found for customer',
          {
            customerId,
            userId: logger.maskUserId(userId),
          }
        );
        return;
      }

      logger.info('PADDLE_WEBHOOK', 'Found pending subscriptions to link', {
        customerId,
        userId: logger.maskUserId(userId),
        pendingCount: pendingSubscriptions.length,
      });

      // 2. Remove existing free subscription
      const { error: deleteError } = await supabase
        .from('subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('tier_type', 'free');

      if (deleteError) {
        logger.warn(
          'PADDLE_WEBHOOK',
          'Failed to delete existing free subscription',
          deleteError
        );
      }

      // 3. Link most recent pending subscription
      const latestSubscription =
        pendingSubscriptions[pendingSubscriptions.length - 1];
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          user_id: userId,
          current: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', latestSubscription.id);

      if (updateError) {
        logger.error(
          'PADDLE_WEBHOOK',
          'Failed to link pending subscription',
          updateError,
          {
            subscriptionId: latestSubscription.id,
            userId: logger.maskUserId(userId),
            customerId,
          }
        );
        throw updateError;
      }

      // 4. Clean up other pending subscriptions
      if (pendingSubscriptions.length > 1) {
        const otherIds = pendingSubscriptions
          .slice(0, -1)
          .map((sub: Subscription) => sub.id);

        const { error: cleanupError } = await supabase
          .from('subscriptions')
          .delete()
          .in('id', otherIds);

        if (cleanupError) {
          logger.warn(
            'PADDLE_WEBHOOK',
            'Failed to cleanup duplicate pending subscriptions',
            cleanupError
          );
        }
      }

      logger.info(
        'PADDLE_WEBHOOK',
        'Successfully linked pending subscription to user',
        {
          subscriptionId: latestSubscription.id,
          userId: logger.maskUserId(userId),
          customerId,
          tierType: latestSubscription.tier_type,
        }
      );
    } catch (error) {
      logger.error(
        'PADDLE_WEBHOOK',
        'Error linking pending subscriptions to user',
        error instanceof Error ? error : new Error(String(error)),
        { customerId, userId: logger.maskUserId(userId) }
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

        // After successful resume to active paid tier, ensure phone provisioning is triggered if needed
        try {
          if (newStatus === 'active' && newTierType !== 'free') {
            if (!(await this.hasActivePhone(supabase, userId))) {
              logger.info(
                'PHONE_PROVISION',
                'Triggering phone-number provisioning on subscription resume',
                {
                  userId: logger.maskUserId(userId),
                  subscriptionId: subscriptionData.id,
                  tierType: newTierType,
                  status: newStatus,
                }
              );
              this.triggerProvision(supabase, {
                userId,
                tierType: newTierType,
                status: newStatus,
                triggerAction: 'subscription_resumed',
                subscriptionId: subscriptionData.id,
              });
            } else {
              logger.info(
                'PHONE_PROVISION',
                'Active phone already exists on resume; skipping',
                {
                  userId: logger.maskUserId(userId),
                  subscriptionId: subscriptionData.id,
                }
              );
            }
          }
        } catch (provErr) {
          logger.error(
            'PHONE_PROVISION',
            'Error during provisioning trigger logic (resume)',
            provErr instanceof Error ? provErr : new Error(String(provErr)),
            {
              userId: logger.maskUserId(userId),
              subscriptionId: subscriptionData.id,
            }
          );
        }
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
    supabase: SupabaseClient,
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

  /**
   * Retry mechanism for failed profile updates with exponential backoff
   */
  private async retryProfileUpdate(
    supabase: SupabaseClient,
    customerId: string,
    customerEmail: string,
    attempt: number = 1,
    maxAttempts: number = 3
  ): Promise<void> {
    try {
      // Exponential backoff: wait 1s, 2s, 4s
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));

      logger.info(
        'PADDLE_WEBHOOK',
        `Retrying profile update (attempt ${attempt}/${maxAttempts})`,
        {
          customerId,
          customerEmail: logger.maskEmail(customerEmail),
          delay,
        }
      );

      const { error: retryError } = await supabase
        .from('profiles')
        .update({ paddle_customer_id: customerId })
        .eq('email', customerEmail);

      if (retryError) {
        if (attempt < maxAttempts) {
          logger.warn(
            'PADDLE_WEBHOOK',
            'Profile update retry failed, will retry again',
            {
              customerId,
              customerEmail: logger.maskEmail(customerEmail),
              attempt,
              error: retryError,
            }
          );
          await this.retryProfileUpdate(
            supabase,
            customerId,
            customerEmail,
            attempt + 1,
            maxAttempts
          );
        } else {
          logger.error(
            'PADDLE_WEBHOOK',
            'Profile update failed after all retry attempts',
            retryError,
            {
              customerId,
              customerEmail: logger.maskEmail(customerEmail),
              maxAttempts,
            }
          );
        }
      } else {
        logger.info('PADDLE_WEBHOOK', 'Profile update retry successful', {
          customerId,
          customerEmail: logger.maskEmail(customerEmail),
          attempt,
        });
      }
    } catch (error) {
      logger.error(
        'PADDLE_WEBHOOK',
        'Error during profile update retry',
        error instanceof Error ? error : new Error(String(error)),
        { customerId, customerEmail: logger.maskEmail(customerEmail), attempt }
      );
    }
  }
}
