import { NextRequest, NextResponse } from 'next/server';
import {
  getUserTransactions,
  getUserTransactionStats,
  getTransactionById, // Keep this for single transaction lookup with validation
} from '@/lib/paddle-transactions';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user and supabase client
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.error(
        'PADDLE_TRANSACTIONS_API',
        'Failed to get authenticated user',
        userError || new Error('No authenticated user'),
        {
          action: request.nextUrl.searchParams.get('action') || 'unknown',
        }
      );
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const transactionId = searchParams.get('transactionId');
    const days = searchParams.get('days')
      ? parseInt(searchParams.get('days')!)
      : undefined;
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : undefined;
    const status = searchParams.get('status')?.split(',') || undefined;

    switch (action) {
      case 'getById': {
        if (!transactionId) {
          return NextResponse.json(
            { error: 'Transaction ID required' },
            { status: 400 }
          );
        }

        // First get user's customer ID for validation
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('paddle_customer_id')
          .eq('id', user.id)
          .single();

        if (profileError || !profile?.paddle_customer_id) {
          logger.error(
            'PADDLE_TRANSACTIONS_API',
            'Failed to get user profile',
            profileError || new Error('Profile not found'),
            {
              userId: logger.maskUserId(user.id),
              action,
            }
          );
          return NextResponse.json(
            { error: 'User profile not found' },
            { status: 403 }
          );
        }

        // Get the transaction and verify it belongs to the user's customer
        const transaction = await getTransactionById(transactionId);
        if (
          !transaction ||
          transaction.customer_id !== profile.paddle_customer_id
        ) {
          logger.warn(
            'PADDLE_TRANSACTIONS_API',
            'User attempted to access transaction for different customer',
            {
              userId: logger.maskUserId(user.id),
              userCustomerId: profile.paddle_customer_id,
              transactionCustomerId: transaction?.customer_id,
              transactionId,
            }
          );
          return NextResponse.json(
            { error: 'Transaction not found or access denied' },
            { status: 404 }
          );
        }

        return NextResponse.json({ transaction });
      }

      case 'getByCustomer': {
        // Use user-scoped function that handles authentication internally
        const result = await getUserTransactions(supabase, {
          limit,
          status,
          includeSubscriptionTransactions: true,
        });

        if (result.error) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ transactions: result.data });
      }

      case 'getRecent': {
        // Use user-scoped function with additional date filtering
        const result = await getUserTransactions(supabase, {
          limit: limit || 50,
          status,
          includeSubscriptionTransactions: true,
        });

        if (result.error) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        // Apply date filtering if specified
        let filteredTransactions = result.data;
        if (days) {
          const daysAgo = new Date();
          daysAgo.setDate(daysAgo.getDate() - days);
          filteredTransactions = result.data.filter(
            transaction => new Date(transaction.created_at) >= daysAgo
          );
        }

        return NextResponse.json({ transactions: filteredTransactions });
      }

      case 'getStats': {
        // Use user-scoped function that handles authentication internally
        const result = await getUserTransactionStats(supabase, {
          days: days || 30,
        });

        if (result.error) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ stats: result.data });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    logger.error(
      'PADDLE_TRANSACTIONS_API',
      'Failed to process transaction request',
      error instanceof Error ? error : new Error(String(error)),
      {
        action: request.nextUrl.searchParams.get('action') || 'unknown',
      }
    );

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Note: POST, PUT, DELETE operations are not supported for transactions
// as they are read-only via Paddle FDW. All transaction creation happens
// via Paddle webhooks and is managed by Paddle directly.
