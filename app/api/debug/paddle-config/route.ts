import { NextResponse } from 'next/server';
import {
  validatePaddleConfiguration,
  getAdminEmails,
  isProduction,
} from '@/lib/config';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    // Environment-based access control
    if (isProduction() && process.env.ENABLE_DEBUG !== 'true') {
      logger.warn(
        'PADDLE_CONFIG_DEBUG',
        'Debug endpoint accessed in production without ENABLE_DEBUG flag'
      );
      return NextResponse.json(
        { error: 'Debug endpoints are disabled in production' },
        { status: 403 }
      );
    }

    // User authentication check
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.warn(
        'PADDLE_CONFIG_DEBUG',
        'Unauthenticated access attempt to debug endpoint'
      );
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Admin authorization check
    const adminEmails = getAdminEmails();
    const userEmail = user.email;

    if (!userEmail || !adminEmails.includes(userEmail)) {
      logger.warn(
        'PADDLE_CONFIG_DEBUG',
        'Non-admin access attempt to debug endpoint',
        {
          userEmail: logger.maskEmail(userEmail),
          adminEmails: adminEmails.map(email => logger.maskEmail(email)),
        }
      );
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Log successful access for audit trail
    logger.info('PADDLE_CONFIG_DEBUG', 'Admin accessed debug endpoint', {
      userEmail: logger.maskEmail(userEmail),
      userId: logger.maskUserId(user.id),
    });

    const config = validatePaddleConfiguration();

    // Calculate webhook URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const webhookUrl = siteUrl
      ? `${siteUrl}/api/webhooks/paddle`
      : 'Not configured';

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      configuration: {
        ...config,
        webhookUrl,
        priceIdMapping:
          process.env.NODE_ENV === 'development'
            ? {
                [process.env.NEXT_PUBLIC_PADDLE_STARTER_MONTHLY_PRICE_ID || '']:
                  'Starter Monthly',
                [process.env.NEXT_PUBLIC_PADDLE_STARTER_ANNUAL_PRICE_ID || '']:
                  'Starter Annual',
                [process.env.NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID || '']:
                  'Pro Monthly',
                [process.env.NEXT_PUBLIC_PADDLE_PRO_ANNUAL_PRICE_ID || '']:
                  'Pro Annual',
              }
            : 'Hidden in production',
      },
      instructions: {
        webhookSetup: 'Configure this webhook URL in your Paddle dashboard',
        ngrokNote:
          'If using ngrok, ensure the tunnel is active and URL matches NEXT_PUBLIC_SITE_URL',
        testing: 'Visit /api/webhooks/paddle with GET request to test endpoint',
      },
    });
  } catch (error) {
    logger.error(
      'PADDLE_CONFIG_DEBUG',
      'Error in debug endpoint',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      {
        error: 'Configuration validation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
