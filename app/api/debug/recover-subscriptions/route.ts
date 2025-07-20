import { NextRequest, NextResponse } from 'next/server';
import {
  recoverSubscriptionLinking,
  recoverUserSubscription,
} from '@/lib/jobs/recovery-subscription-linking';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, action = 'auto' } = body;

    logger.info('RECOVERY_ENDPOINT', 'Recovery request received', {
      action,
      email: email ? logger.maskEmail(email) : 'not specified',
    });

    if (action === 'user' && email) {
      // Manual recovery for specific user
      const result = await recoverUserSubscription(email);
      return NextResponse.json({
        success: true,
        action: 'user_recovery',
        email: logger.maskEmail(email),
        result,
        timestamp: new Date().toISOString(),
      });
    } else if (action === 'auto') {
      // Automatic recovery for all pending subscriptions
      const result = await recoverSubscriptionLinking();
      return NextResponse.json({
        success: true,
        action: 'auto_recovery',
        result,
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json(
        {
          error: 'Invalid action or missing email',
          message:
            'Use action: "auto" for automatic recovery or action: "user" with email for specific user recovery',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error(
      'RECOVERY_ENDPOINT',
      'Recovery request failed',
      error instanceof Error ? error : new Error(String(error))
    );

    return NextResponse.json(
      {
        error: 'Recovery failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Subscription recovery endpoint',
    usage: {
      auto_recovery: 'POST with { "action": "auto" }',
      user_recovery:
        'POST with { "action": "user", "email": "user@example.com" }',
    },
    timestamp: new Date().toISOString(),
  });
}
