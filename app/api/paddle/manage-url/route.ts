import { NextRequest, NextResponse } from 'next/server';
import { Paddle, Environment } from '@paddle/paddle-node-sdk';
import type {
  Subscription,
  CustomerPortalSession,
  SubscriptionManagement,
} from '@paddle/paddle-node-sdk';
import { logger } from '@/lib/logger';

// Type for subscription that might have management URLs available
type SubscriptionWithManagement = Subscription & {
  managementUrls?: SubscriptionManagement | null;
};

// Type for customer portal session that might have a direct URL
type CustomerPortalSessionWithUrl = CustomerPortalSession & {
  url?: string;
};

// This endpoint returns a secure, short-lived management URL for a subscription.
// It requires the client to POST `{ subscriptionId: "sub_..." }`.
// For security reasons we don't expose our Paddle API key to the browser.

export async function POST(req: NextRequest) {
  try {
    const { subscriptionId } = await req.json();
    if (
      typeof subscriptionId !== 'string' ||
      !subscriptionId.startsWith('sub_')
    ) {
      return NextResponse.json(
        { error: 'Invalid subscriptionId' },
        { status: 400 }
      );
    }

    const apiKey = process.env.PADDLE_API_KEY;
    if (!apiKey) {
      logger.error(
        'PADDLE_MANAGE_URL',
        'PADDLE_API_KEY environment variable missing'
      );
      return NextResponse.json(
        { error: 'Server mis-configured.' },
        { status: 500 }
      );
    }

    // Use sandbox if the key starts with sandbox- or an explicit env var says so.
    const isSandbox = [
      process.env.PADDLE_ENV,
      process.env.PADDLE_ENVIRONMENT,
      process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT,
    ]
      .filter(Boolean)
      .some(val => val?.toLowerCase() === 'sandbox');

    // Node SDK also treats keys starting with "sandbox-" specially (old format)
    const finalIsSandbox =
      isSandbox || apiKey.toLowerCase().startsWith('sandbox');

    const paddle = new Paddle(apiKey, {
      environment: finalIsSandbox
        ? Environment.sandbox
        : Environment.production,
    });

    // Fetch subscription, including management URLs.
    try {
      const sub = (await paddle.subscriptions.get(
        subscriptionId
      )) as SubscriptionWithManagement;

      // Try to get the update payment method URL from management URLs
      const url = sub?.managementUrls?.updatePaymentMethod;

      if (url) {
        return NextResponse.json({ url });
      }
    } catch (err: any) {
      if (err?.code !== 'forbidden') {
        throw err; // unhandled error
      }
      // fall through to try customer-portal session
    }

    // Fallback: generate a customer-portal session which always returns a URL
    try {
      // Fetch subscription minimal to get customerId
      const subSlim = (await paddle.subscriptions.get(
        subscriptionId
      )) as Subscription;

      const customerId = subSlim.customerId;
      if (!customerId) {
        return NextResponse.json(
          { error: 'Customer information not found for subscription.' },
          { status: 404 }
        );
      }

      const session = (await paddle.customerPortalSessions.create(customerId, [
        subscriptionId,
      ])) as CustomerPortalSessionWithUrl;

      // Try to get URL from session directly or from the overview URL
      const sessionUrl = session?.url || session?.urls?.general?.overview;

      if (sessionUrl) {
        return NextResponse.json({ url: sessionUrl });
      }
    } catch (err: any) {
      logger.error(
        'PADDLE_MANAGE_URL',
        'Customer portal fallback failed',
        err instanceof Error ? err : new Error(String(err))
      );
      return NextResponse.json(
        { error: 'Unable to create management session.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Management URL could not be generated.' },
      { status: 500 }
    );
  } catch (err: any) {
    logger.error(
      'PADDLE_MANAGE_URL',
      'Error creating management URL',
      err instanceof Error ? err : new Error(String(err))
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
