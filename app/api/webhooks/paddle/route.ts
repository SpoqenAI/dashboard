import { NextRequest, NextResponse } from 'next/server';
import { Paddle } from '@paddle/paddle-node-sdk';
import { createClient } from '@supabase/supabase-js';

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
  // Minimal request receipt log (headers omitted to reduce noise)
  console.log('🎣 Webhook received:', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
  });

  const paddleApiKey = process.env.PADDLE_API_KEY;
  if (!paddleApiKey || paddleApiKey.trim() === '') {
    console.error('PADDLE_API_KEY environment variable is missing or empty');
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
    console.error(
      'PADDLE_WEBHOOK_SECRET environment variable is missing or empty'
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
    console.log(
      '🔍 Processing webhook (sig prefix):',
      signature.slice(0, 20) + '...'
    );

    let event;
    try {
      event = await paddle.webhooks.unmarshal(
        rawBody,
        webhookSecret,
        signature
      );
    } catch (verifyErr: any) {
      console.error(
        '❌ Signature verification threw:',
        verifyErr?.message || verifyErr
      );

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
       *     console.error('🔎 Expected HMAC (first 16):', expected.slice(0, 16));
       *     console.error('🔎 Received HMAC (first 16):', sigH1.slice(0, 16));
       *     console.error('🔎 Timestamp diff (s):', Date.now() / 1000 - Number(ts));
       *   }
       * } catch (diagErr) {
       *   console.error('⚠️ Failed to run diagnostic HMAC comparison:', diagErr);
       * }
       */

      return NextResponse.json(
        { error: 'Signature verification failed.' },
        { status: 400 }
      );
    }

    if (!event) {
      console.error('❌ Signature verification returned falsy event');
      return NextResponse.json(
        { error: 'Signature verification failed.' },
        { status: 400 }
      );
    }

    console.log('✅ Webhook verified. Event type:', event.eventType);

    // Extract the Supabase user ID from the custom data you passed earlier
    // Try multiple locations where Paddle might store custom data
    let userId = null;
    const eventData = event.data as any;

    // Try different locations for user_id
    if (eventData.custom_data?.user_id) {
      userId = eventData.custom_data.user_id;
      console.log('👤 Found user_id in custom_data:', userId);
    } else if (eventData.customData?.user_id) {
      userId = eventData.customData.user_id;
      console.log('👤 Found user_id in customData:', userId);
    } else if (eventData.checkout?.custom_data?.user_id) {
      userId = eventData.checkout.custom_data.user_id;
      console.log('👤 Found user_id in checkout.custom_data:', userId);
    } else if (eventData.checkout?.customData?.user_id) {
      userId = eventData.checkout.customData.user_id;
      console.log('👤 Found user_id in checkout.customData:', userId);
    } else {
      // Log all possible locations for debugging
      console.log('🔍 Searching for user_id in all possible locations:', {
        'eventData.custom_data': eventData.custom_data,
        'eventData.customData': eventData.customData,
        'eventData.checkout': eventData.checkout,
        'eventData.customer': eventData.customer,
        'eventData.transaction': eventData.transaction,
      });

      console.warn(
        '⚠️ user_id not found in custom data. Attempting to resolve by customer email...'
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
          console.error('❌ Error searching profile by email:', profileError);
        }

        if (profile?.id) {
          userId = profile.id;
          console.log('✅ Resolved user_id from email:', userId);
        }
      }

      if (!userId) {
        const errorMessage = `Critical: Webhook event ${event.eventType} received without a user_id and could not resolve by email.`;
        console.error(errorMessage, {
          eventType: event.eventType,
          eventId: eventData.id,
          customerEmail: eventData.customer?.email,
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

        // Upsert subscription details into your database
        const { error: subError } = await supabase
          .from('subscriptions')
          .upsert(subData, { onConflict: 'id' });
        if (subError) throw subError;

        // Also update the user's profile with their Paddle Customer ID
        const { error: profError } = await supabase
          .from('profiles')
          .update({ paddle_customer_id: eventData.customer_id })
          .eq('id', userId);
        if (profError) throw profError;

        console.log(
          `✅ Processed subscription ${eventData.id} for user ${userId}.`,
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
        console.log(
          `Canceled subscription ${cancelEventData.id} for user ${userId}.`
        );
        break;
      }

      default: {
        console.log(`Unhandled webhook event type: ${event.eventType}`);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Error processing webhook:', err.message);
    return NextResponse.json(
      { error: 'Webhook handler failed.' },
      { status: 500 }
    );
  }
}
