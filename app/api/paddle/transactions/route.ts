import { NextRequest, NextResponse } from 'next/server';
import {
  getTransactionsByCustomerId,
  getTransactionStats,
  getTransactionById,
} from '@/lib/paddle-transactions';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
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

    // Get user's Paddle customer ID for authorization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('paddle_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      logger.error(
        'PADDLE_TRANSACTIONS_API',
        'Failed to get user profile',
        profileError || new Error('Profile not found'),
        {
          userId: logger.maskUserId(user.id),
          action: request.nextUrl.searchParams.get('action') || 'unknown',
        }
      );
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 403 }
      );
    }

    const userCustomerId = profile.paddle_customer_id;
    if (!userCustomerId) {
      logger.warn('PADDLE_TRANSACTIONS_API', 'User has no Paddle customer ID', {
        userId: logger.maskUserId(user.id),
        action: request.nextUrl.searchParams.get('action') || 'unknown',
      });
      return NextResponse.json(
        { error: 'No billing data available' },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const transactionId = searchParams.get('transactionId');
    const customerId = searchParams.get('customerId');
    const days = searchParams.get('days')
      ? parseInt(searchParams.get('days')!)
      : undefined;
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : undefined;
    const status = searchParams.get('status')?.split(',') || undefined;

    // Validate that any provided customerId matches the user's customer ID
    if (customerId && customerId !== userCustomerId) {
      logger.warn(
        'PADDLE_TRANSACTIONS_API',
        'User attempted to access transactions for different customer',
        {
          userId: logger.maskUserId(user.id),
          userCustomerId,
          requestedCustomerId: customerId,
          action,
        }
      );
      return NextResponse.json(
        { error: 'Access denied to requested customer data' },
        { status: 403 }
      );
    }

    switch (action) {
      case 'getById': {
        if (!transactionId) {
          return NextResponse.json(
            { error: 'Transaction ID required' },
            { status: 400 }
          );
        }

        // Get the transaction and verify it belongs to the user's customer
        const transaction = await getTransactionById(transactionId);
        if (!transaction || transaction.customer_id !== userCustomerId) {
          logger.warn(
            'PADDLE_TRANSACTIONS_API',
            'User attempted to access transaction for different customer',
            {
              userId: logger.maskUserId(user.id),
              userCustomerId,
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
        // Use the authenticated user's customer ID instead of the provided one
        const customerTransactions = await getTransactionsByCustomerId(
          userCustomerId,
          {
            limit,
            status,
            includeSubscriptionTransactions: true,
          }
        );
        return NextResponse.json({ transactions: customerTransactions });
      }

      case 'getRecent': {
        // Get recent transactions for the authenticated user's customer
        // We'll use getTransactionsByCustomerId which already filters by customer ID
        const recentTransactions = await getTransactionsByCustomerId(
          userCustomerId,
          {
            limit: limit || 50,
            status,
            includeSubscriptionTransactions: true,
          }
        );

        // Apply date filtering if specified
        let filteredTransactions = recentTransactions;
        if (days) {
          const daysAgo = new Date();
          daysAgo.setDate(daysAgo.getDate() - days);
          filteredTransactions = recentTransactions.filter(
            transaction => new Date(transaction.created_at) >= daysAgo
          );
        }

        return NextResponse.json({ transactions: filteredTransactions });
      }

      case 'getStats': {
        // Get stats only for the authenticated user's customer
        const stats = await getTransactionStats({
          days: days || 30,
          customerId: userCustomerId,
        });
        return NextResponse.json({ stats });
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
