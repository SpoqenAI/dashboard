import { NextRequest, NextResponse } from 'next/server';
import { Paddle } from '@paddle/paddle-node-sdk';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
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
  const supabase = await createClient();
  const signature = req.headers.get('paddle-signature') || '';
  const rawBody = await req.text();

  try {
    // Verify and parse the webhook to ensure it's authentic
    const event = await paddle.webhooks.unmarshal(
      rawBody,
      webhookSecret,
      signature
    );
    if (!event) {
      return NextResponse.json(
        { error: 'Signature verification failed.' },
        { status: 400 }
      );
    }

    // Extract the Supabase user ID from the custom data you passed earlier
    const userId = (event.data as any).custom_data?.user_id;
    if (!userId) {
      const errorMessage = `Critical: Webhook event ${event.eventType} received without a user_id. Event ID: ${(event.data as any).id || 'unknown'}`;
      console.error(errorMessage, {
        eventType: event.eventType,
        eventId: (event.data as any).id,
        customData: (event.data as any).custom_data,
        timestamp: new Date().toISOString(),
      });

      // Return 400 Bad Request so Paddle retries the webhook
      return NextResponse.json(
        {
          error: 'Missing required user_id in custom_data',
          eventType: event.eventType,
          eventId: (event.data as any).id,
        },
        { status: 400 }
      );
    }

    // Handle different event types from Paddle
    switch (event.eventType) {
      case 'subscription.created':
      case 'subscription.updated': {
        const eventData = event.data as any;
        const subData = {
          id: eventData.id,
          user_id: userId,
          status: eventData.status,
          price_id: eventData.items?.[0]?.price?.id,
          quantity: eventData.items?.[0]?.quantity,
          cancel_at_period_end: eventData.cancel_at_period_end,
          current_period_start_at: eventData.current_period_start,
          current_period_end_at: eventData.current_period_end,
          ended_at: eventData.ended_at,
          canceled_at: eventData.canceled_at,
          trial_start_at: eventData.trial_dates?.starts_at,
          trial_end_at: eventData.trial_dates?.ends_at,
        };

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
          `Processed subscription ${eventData.id} for user ${userId}.`
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
