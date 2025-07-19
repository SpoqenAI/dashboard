'use server';

import { Paddle, Environment } from '@paddle/paddle-node-sdk';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { validatePaddleConfig } from '@/lib/paddle';
import { getSiteUrl } from '@/lib/site-url';
import { generateSuccessUrl } from '@/lib/paddle-js';

// Shared helper function for Paddle environment detection
function getPaddleEnvironment(): {
  isSandbox: boolean;
  environment: 'sandbox' | 'production';
} {
  const envVar =
    process.env.PADDLE_ENVIRONMENT ||
    process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT;
  const isSandbox =
    envVar?.toLowerCase() === 'sandbox' ||
    process.env.PADDLE_API_KEY?.toLowerCase().startsWith('sandbox') ||
    false;

  return {
    isSandbox,
    environment: isSandbox ? 'sandbox' : 'production',
  };
}

// Initialize Paddle client
function createPaddleClient() {
  const apiKey = process.env.PADDLE_API_KEY;

  if (!apiKey) {
    throw new Error('PADDLE_API_KEY environment variable is required');
  }

  const { isSandbox } = getPaddleEnvironment();

  return new Paddle(apiKey, {
    environment: isSandbox ? Environment.sandbox : Environment.production,
  });
}

export async function createCheckoutSession(priceId: string): Promise<{
  success: boolean;
  checkoutUrl?: string; // Fallback redirect URL
  checkoutId?: string; // Transaction / Checkout ID for Paddle JS overlay
  environment?: 'sandbox' | 'production';
  error?: string;
}> {
  try {
    // Validate Paddle configuration
    const configValidation = validatePaddleConfig();
    if (!configValidation.isValid) {
      logger.error(
        'PADDLE_CHECKOUT',
        'Paddle configuration invalid',
        new Error('Missing environment variables'),
        {
          missingVars: configValidation.missingVars,
        }
      );
      return {
        success: false,
        error:
          'Payment system not properly configured. Please contact support.',
      };
    }

    // Get current user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    // Get user profile for checkout
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      logger.error(
        'PADDLE_CHECKOUT',
        'Profile not found',
        profileError || new Error('Profile not found'),
        {
          userId: logger.maskUserId(user.id),
        }
      );
      return {
        success: false,
        error: 'User profile not found',
      };
    }

    // Get environment for response convenience
    const { environment } = getPaddleEnvironment();

    // Create Paddle client
    const paddle = createPaddleClient();

    // Determine the base site URL dynamically. This avoids hard-coded localhost values
    // making it work correctly in all environments (local dev, Vercel preview, production).
    // getSiteUrl() already handles NODE_ENV, Vercel URLs, ngrok etc.
    const baseUrl = getSiteUrl();

    const checkoutData = {
      items: [
        {
          priceId: priceId,
          quantity: 1,
        },
      ],
      customData: {
        user_id: user.id,
      },
      customer: {
        email: profile.email,
        ...(profile.first_name &&
          profile.last_name && {
            name: `${profile.first_name} ${profile.last_name}`.trim(),
          }),
      },
      settings: {
        successUrl: generateSuccessUrl('/api/paddle/success', {
          user_id: user.id,
        }),
        allowLogout: false,
      },
    };

    logger.info('PADDLE_CHECKOUT', 'Creating checkout session', {
      userId: logger.maskUserId(user.id),
      priceId,
      customerEmail: profile.email,
    });

    const transaction = await paddle.transactions.create(checkoutData);

    if (!transaction.checkout?.url) {
      logger.error(
        'PADDLE_CHECKOUT',
        'No checkout URL returned',
        new Error('Missing checkout URL'),
        {
          userId: logger.maskUserId(user.id),
          transactionId: transaction.id,
        }
      );
      return {
        success: false,
        error: 'Failed to create checkout session',
      };
    }

    logger.info('PADDLE_CHECKOUT', 'Checkout session created successfully', {
      userId: logger.maskUserId(user.id),
      transactionId: transaction.id,
    });

    return {
      success: true,
      checkoutUrl: transaction.checkout.url,
      checkoutId: transaction.id,
      environment,
    };
  } catch (error: any) {
    logger.error(
      'PADDLE_CHECKOUT',
      'Failed to create checkout session',
      error instanceof Error ? error : new Error(String(error)),
      {
        priceId,
        errorType: error?.type,
        errorCode: error?.code,
        errorDetail: error?.detail,
      }
    );

    // Provide more helpful error messages for common issues
    let userFriendlyError =
      'Failed to create checkout session. Please try again.';

    if (
      error?.code === 'forbidden' &&
      error?.detail?.includes('not authorized')
    ) {
      userFriendlyError =
        'API key permissions error. Please check your Paddle dashboard - your API key needs "Transactions" permissions.';
    } else if (error?.code === 'unauthorized') {
      userFriendlyError =
        'Invalid API key. Please check your Paddle configuration.';
    } else if (error?.detail) {
      userFriendlyError = error.detail;
    }

    return {
      success: false,
      error: userFriendlyError,
    };
  }
}

export async function createCustomerPortalSession(): Promise<{
  success: boolean;
  portalUrl?: string;
  error?: string;
}> {
  try {
    // Get current user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    // Get user's active subscription
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('id, paddle_customer_id')
      .eq('user_id', user.id)
      .eq('current', true)
      .single();

    if (subscriptionError || !subscription) {
      logger.error(
        'PADDLE_PORTAL',
        'No active subscription found',
        subscriptionError || new Error('No subscription'),
        {
          userId: logger.maskUserId(user.id),
        }
      );
      return {
        success: false,
        error: 'No active subscription found',
      };
    }

    if (!subscription.paddle_customer_id) {
      logger.error(
        'PADDLE_PORTAL',
        'No Paddle customer ID found',
        new Error('Missing customer ID'),
        {
          userId: logger.maskUserId(user.id),
          subscriptionId: subscription.id,
        }
      );
      return {
        success: false,
        error: 'Customer information not found',
      };
    }

    // Create Paddle client
    const paddle = createPaddleClient();

    // Create customer portal session
    const session = await paddle.customerPortalSessions.create(
      subscription.paddle_customer_id,
      [subscription.id]
    );

    if (!session.urls?.general?.overview) {
      logger.error(
        'PADDLE_PORTAL',
        'No portal URL returned',
        new Error('Missing portal URL'),
        {
          userId: logger.maskUserId(user.id),
          customerId: subscription.paddle_customer_id,
        }
      );
      return {
        success: false,
        error: 'Failed to create customer portal session',
      };
    }

    logger.info(
      'PADDLE_PORTAL',
      'Customer portal session created successfully',
      {
        userId: logger.maskUserId(user.id),
        customerId: subscription.paddle_customer_id,
      }
    );

    return {
      success: true,
      portalUrl: session.urls.general.overview,
    };
  } catch (error) {
    logger.error(
      'PADDLE_PORTAL',
      'Failed to create customer portal session',
      error instanceof Error ? error : new Error(String(error))
    );

    return {
      success: false,
      error: 'Failed to create customer portal session. Please try again.',
    };
  }
}

// Helper function to get subscription management URL for a specific subscription
export async function getSubscriptionManagementUrl(
  subscriptionId: string
): Promise<{
  success: boolean;
  managementUrl?: string;
  error?: string;
}> {
  try {
    if (!subscriptionId || !subscriptionId.startsWith('sub_')) {
      return {
        success: false,
        error: 'Invalid subscription ID',
      };
    }

    // Create Paddle client
    const paddle = createPaddleClient();

    // Try to get subscription with management URLs
    const subscription = await paddle.subscriptions.get(subscriptionId);

    // Check if management URLs are available
    if (subscription.managementUrls?.updatePaymentMethod) {
      return {
        success: true,
        managementUrl: subscription.managementUrls.updatePaymentMethod,
      };
    }

    // Fallback to customer portal
    const customerId = subscription.customerId;
    if (!customerId) {
      return {
        success: false,
        error: 'Customer information not found',
      };
    }

    const session = await paddle.customerPortalSessions.create(customerId, [
      subscriptionId,
    ]);

    if (session.urls?.general?.overview) {
      return {
        success: true,
        managementUrl: session.urls.general.overview,
      };
    }

    return {
      success: false,
      error: 'Unable to generate management URL',
    };
  } catch (error) {
    logger.error(
      'PADDLE_MANAGEMENT',
      'Failed to get subscription management URL',
      error instanceof Error ? error : new Error(String(error)),
      { subscriptionId }
    );

    return {
      success: false,
      error: 'Failed to get management URL. Please try again.',
    };
  }
}
