import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_CONFIG, StripePlan } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { priceId, planType } = body as {
      priceId: string;
      planType: StripePlan;
    };

    // Validate the plan type
    if (planType !== 'professional') {
      return NextResponse.json(
        { error: 'Invalid plan type' },
        { status: 400 }
      );
    }

    // Get user from Supabase
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user already has a Stripe customer ID
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    let customerId = subscription?.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;

      // Update user_subscriptions with customer ID
      await supabase
        .from('user_subscriptions')
        .upsert({
          id: user.id,
          stripe_customer_id: customerId,
        });
    }

    // Get the origin for redirect URLs
    const headersList = await headers();
    const origin = headersList.get('origin') || process.env.NEXT_PUBLIC_SITE_URL;

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${origin}/settings?tab=billing&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/settings?tab=billing`,
      metadata: {
        supabase_user_id: user.id,
        plan_type: planType,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan_type: planType,
        },
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 