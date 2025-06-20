import { NextRequest, NextResponse } from 'next/server';
import { Paddle } from '@paddle/paddle-node-sdk';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { provisionAssistant } from '@/lib/actions/assistant.actions';

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

export async function POST(req: NextRequest) {
  // Log webhook receipt without exposing sensitive headers
  logger.info('WEBHOOK', 'Paddle webhook received', {
    method: req.method,
    timestamp: new Date().toISOString(),
    hasSignature: !!req.headers.get('paddle-signature'),
  });

  const paddleApiKey = process.env.PADDLE_API_KEY;
  if (!paddleApiKey || paddleApiKey.trim() === '') {
    logger.error('WEBHOOK', 'PADDLE_API_KEY environment variable missing');
    return NextResponse.json(
      {
        error:
          'PADDLE_API_KEY environment variable is required for Paddle webhook processing',
      },
      { status: 500 }
    );
  }

  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!webhookSecret || webhookSecret.trim() === '') {
    logger.error(
      'WEBHOOK',
      'PADDLE_WEBHOOK_SECRET environment variable missing'
    );
    return NextResponse.json(
      {
        error:
          'PADDLE_WEBHOOK_SECRET environment variable is required for Paddle webhook processing',
      },
      { status: 500 }
    );
  }

  const paddle = new Paddle(paddleApiKey);
  const supabase = createSupabaseAdmin();
  const signature = req.headers.get('paddle-signature') || '';

  // Use arrayBuffer to avoid issues where req.text() returns empty
  const rawArrayBuffer = await req.arrayBuffer();
  const rawBody = Buffer.from(rawArrayBuffer).toString();

  try {
    logger.debug('WEBHOOK', 'Processing webhook signature verification', {
      hasSignature: !!signature,
      bodyLength: rawBody.length,
    });

    let event;
    try {
      event = await paddle.webhooks.unmarshal(
        rawBody,
        webhookSecret,
        signature
      );
    } catch (verifyErr: any) {
      logger.error('WEBHOOK', 'Signature verification failed', verifyErr, {
        errorMessage: verifyErr?.message,
      });

      /*
       * HMAC mismatch diagnostics – keep for future debugging.
       * Uncomment if you ever need to compare Paddle-signed payloads again.
       *
       * try {
       *   const match = signature.match(/^ts=(\d+);h1=([a-f0-9]+)$/);
       *   if (match) {
       *     const [, ts, sigH1] = match;
       *     const crypto = await import('crypto');
       *     const expected = crypto
       *       .createHmac('sha256', webhookSecret)
       *       .update(`${ts}:${rawBody}`)
       *       .digest('hex');
       *     logger.debug('WEBHOOK', 'HMAC diagnostic', {
       *       expectedPrefix: expected.slice(0, 16),
       *       receivedPrefix: sigH1.slice(0, 16),
       *       timestampDiff: Date.now() / 1000 - Number(ts),
       *     });
       *   }
       * } catch (diagErr) {
       *   logger.error('WEBHOOK', 'Failed to run diagnostic HMAC comparison', diagErr);
       * }
       */

      return NextResponse.json(
        { error: 'Signature verification failed.' },
        { status: 400 }
      );
    }

    if (!event) {
      logger.error('WEBHOOK', 'Signature verification returned falsy event');
      return NextResponse.json(
        { error: 'Signature verification failed.' },
        { status: 400 }
      );
    }

    logger.info('WEBHOOK', 'Webhook verified successfully', {
      eventType: event.eventType,
    });

    // Extract the Supabase user ID from the custom data you passed earlier
    // Try multiple locations where Paddle might store custom data
    let userId = null;
    const eventData = event.data as any;

    // Try different locations for user_id
    if (eventData.custom_data?.user_id) {
      userId = eventData.custom_data.user_id;
      logger.debug('WEBHOOK', 'Found user_id in custom_data', {
        userId: logger.maskUserId(userId),
      });
    } else if (eventData.customData?.user_id) {
      userId = eventData.customData.user_id;
      logger.debug('WEBHOOK', 'Found user_id in customData', {
        userId: logger.maskUserId(userId),
      });
    } else if (eventData.checkout?.custom_data?.user_id) {
      userId = eventData.checkout.custom_data.user_id;
      logger.debug('WEBHOOK', 'Found user_id in checkout.custom_data', {
        userId: logger.maskUserId(userId),
      });
    } else if (eventData.checkout?.customData?.user_id) {
      userId = eventData.checkout.customData.user_id;
      logger.debug('WEBHOOK', 'Found user_id in checkout.customData', {
        userId: logger.maskUserId(userId),
      });
    } else {
      // Log structure analysis without exposing sensitive data
      logger.debug('WEBHOOK', 'Searching for user_id in event structure', {
        hasCustomData: !!eventData.custom_data,
        hasCustomDataAlt: !!eventData.customData,
        hasCheckout: !!eventData.checkout,
        hasCustomer: !!eventData.customer,
        hasTransaction: !!eventData.transaction,
      });

      logger.warn(
        'WEBHOOK',
        'user_id not found in custom data, attempting email resolution'
      );

      const customerEmail =
        eventData.customer?.email || eventData.customer_email;
      if (customerEmail) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .ilike('email', customerEmail)
          .maybeSingle();

        if (profileError) {
          logger.error(
            'WEBHOOK',
            'Error searching profile by email',
            profileError,
            {
              email: logger.maskEmail(customerEmail),
            }
          );
        }

        if (profile?.id) {
          userId = profile.id;
          logger.info('WEBHOOK', 'Resolved user_id from email', {
            userId: logger.maskUserId(userId),
            email: logger.maskEmail(customerEmail),
          });
        }
      }

      if (!userId) {
        const errorMessage = `Critical: Webhook event ${event.eventType} received without a user_id and could not resolve by email.`;
        logger.error('WEBHOOK', errorMessage, undefined, {
          eventType: event.eventType,
          eventId: eventData.id,
          hasCustomerEmail: !!eventData.customer?.email,
          timestamp: new Date().toISOString(),
        });

        // Return 400 Bad Request so Paddle retries the webhook
        return NextResponse.json(
          {
            error:
              'Missing required user_id in custom_data and unable to resolve via email',
            eventType: event.eventType,
            eventId: eventData.id,
            debug:
              'Ensure checkout passes user_id in customData or customer email matches a profile',
          },
          { status: 400 }
        );
      }
    }

    // Handle different event types from Paddle
    switch (event.eventType) {
      case 'subscription.created':
      case 'subscription.updated': {
        const eventData = event.data as any;
        // Map Paddle Billing fields → local column names
        const currentPeriod =
          eventData.currentBillingPeriod ||
          eventData.current_billing_period ||
          {};

        const trialDates = eventData.trialDates || eventData.trial_dates || {};
        const scheduledChange = eventData.scheduled_change || {};

        // 1️⃣ Derive reliable period boundaries ---------------------------------
        // Prefer current_billing_period, then trial dates (for trialing subs),
        // then top-level timestamps.
        const periodStart =
          // current period
          currentPeriod.startsAt ??
          currentPeriod.starts_at ??
          // trial period (some events send trial window when subscription is still trialing)
          trialDates.startsAt ??
          trialDates.starts_at ??
          // top-level fall-backs
          eventData.startedAt ??
          eventData.started_at ??
          eventData.firstBilledAt ??
          eventData.first_billed_at ??
          null;

        const periodEnd =
          currentPeriod.endsAt ??
          currentPeriod.ends_at ??
          trialDates.endsAt ??
          trialDates.ends_at ??
          eventData.nextBilledAt ??
          eventData.next_billed_at ??
          null;

        const subData: Record<string, any> = {
          id: eventData.id,
          user_id: userId,
          status: eventData.status, // active, trialing, paused, canceled, etc.

          price_id: eventData.items?.[0]?.price?.id ?? null,
          quantity: eventData.items?.[0]?.quantity ?? null,

          // Will be TRUE if Paddle will cancel at the end of term (there is a scheduled_change action "cancel")
          cancel_at_period_end:
            scheduledChange.action === 'cancel' ? true : false,

          // When the subscription actually ended (only set for canceled/expired subs)
          ended_at: eventData.endedAt ?? eventData.ended_at ?? null,

          // Timestamp the user clicked cancel (if already canceled)
          cancel_at:
            scheduledChange.action === 'cancel'
              ? (scheduledChange.effective_at ?? null)
              : null,

          // When the cancel became effective (status switched to "canceled")
          canceled_at: eventData.canceledAt ?? eventData.canceled_at ?? null,

          // Trial information (if any)
          trial_start_at: trialDates.startsAt ?? trialDates.starts_at ?? null,
          trial_end_at: trialDates.endsAt ?? trialDates.ends_at ?? null,
        };

        // Only set period dates if we actually have values – avoids overwriting
        // existing non-null data with null on subsequent webhook events.
        if (periodStart) subData.current_period_start_at = periodStart;
        if (periodEnd) subData.current_period_end_at = periodEnd;

        // Check if user already has a subscription to avoid constraint violations
        const { data: existingSubscription } = await supabase
          .from('subscriptions')
          .select('id, user_id')
          .eq('user_id', userId)
          .maybeSingle();

        let subError = null;
        if (existingSubscription) {
          // User already has a subscription, update it with new Paddle subscription data
          const { error } = await supabase
            .from('subscriptions')
            .update(subData)
            .eq('user_id', userId);
          subError = error;
          
          logger.info('WEBHOOK', 'Updated existing subscription for user', {
            userId: logger.maskUserId(userId),
            existingSubscriptionId: existingSubscription.id,
            newSubscriptionId: eventData.id,
          });
        } else {
          // No existing subscription, insert new one
          const { error } = await supabase
            .from('subscriptions')
            .insert(subData);
          subError = error;
        }
        
        if (subError) throw subError;

        // Also update the user's profile with their Paddle Customer ID
        const { error: profError } = await supabase
          .from('profiles')
          .update({ paddle_customer_id: eventData.customer_id })
          .eq('id', userId);
        if (profError) throw profError;

        logger.info(
          'WEBHOOK',
          `Processed subscription ${eventData.id} for user ${userId}.`,
          {
            subscriptionId: eventData.id,
            userId: userId,
            status: eventData.status,
            priceId: eventData.items?.[0]?.price?.id,
            customerId: eventData.customer_id,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
          }
        );

        // Trigger assistant provisioning for active subscriptions
        if (eventData.status === 'active') {
          try {
            // Check if user already has an active assistant to avoid duplicate provisioning
            const { data: existingAssistant } = await supabase
              .from('assistants')
              .select('id, status')
              .eq('user_id', userId)
              .eq('status', 'active')
              .maybeSingle();

            if (existingAssistant) {
              logger.info('WEBHOOK', 'User already has active assistant, skipping provisioning', {
                userId: logger.maskUserId(userId),
                assistantId: existingAssistant.id,
                subscriptionId: eventData.id,
              });
            } else {
              logger.info('WEBHOOK', 'Triggering assistant provisioning workflow', {
                userId: logger.maskUserId(userId),
                subscriptionId: eventData.id,
              });
              await provisionAssistant(userId);
            }
          } catch (provisioningError) {
            // CRITICAL: Catch the error but do not re-throw it.
            // This ensures Paddle receives a 200 OK and doesn't retry the webhook.
            // The error is already logged and handled within provisionAssistant.
            logger.error(
              'WEBHOOK',
              `Provisioning workflow failed for user ${logger.maskUserId(userId)}, but acknowledging webhook receipt`,
              provisioningError instanceof Error ? provisioningError : new Error(String(provisioningError)),
              {
                userId: logger.maskUserId(userId),
                subscriptionId: eventData.id,
              }
            );
          }
        }

        break;
      }

      case 'subscription.canceled': {
        const cancelEventData = event.data as any;
        const { error: cancelError } = await supabase
          .from('subscriptions')
          .update({
            status: cancelEventData.status,
            canceled_at: cancelEventData.canceled_at,
            ended_at: cancelEventData.ended_at,
          })
          .eq('id', cancelEventData.id);
        if (cancelError) throw cancelError;
        logger.info(
          'WEBHOOK',
          `Canceled subscription ${cancelEventData.id} for user ${userId}.`
        );
        break;
      }

      default: {
        logger.info(
          `WEBHOOK`,
          `Unhandled webhook event type: ${event.eventType}`
        );
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    logger.error('WEBHOOK', 'Error processing webhook', err, {
      errorMessage: err.message,
    });
    return NextResponse.json(
      { error: 'Webhook handler failed.' },
      { status: 500 }
    );
  }
}
