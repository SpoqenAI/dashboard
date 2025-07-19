import { NextRequest, NextResponse } from 'next/server';
import {
  getTransactionsByCustomerId,
  getRecentTransactions,
  getTransactionStats,
  getTransactionById,
} from '@/lib/paddle-transactions';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // For now, using admin client for transaction queries
    // In production, you'd want to add proper user authentication and authorization

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

    switch (action) {
      case 'getById':
        if (!transactionId) {
          return NextResponse.json(
            { error: 'Transaction ID required' },
            { status: 400 }
          );
        }
        const transaction = await getTransactionById(transactionId);
        return NextResponse.json({ transaction });

      case 'getByCustomer':
        if (!customerId) {
          return NextResponse.json(
            { error: 'Customer ID required' },
            { status: 400 }
          );
        }
        const customerTransactions = await getTransactionsByCustomerId(
          customerId,
          {
            limit,
            status,
            includeSubscriptionTransactions: true,
          }
        );
        return NextResponse.json({ transactions: customerTransactions });

      case 'getRecent':
        const recentTransactions = await getRecentTransactions({
          limit: limit || 50,
          days: days || 30,
          status,
          includeSubscriptionTransactions: true,
        });
        return NextResponse.json({ transactions: recentTransactions });

      case 'getStats':
        const stats = await getTransactionStats({
          days: days || 30,
          customerId: customerId || undefined,
        });
        return NextResponse.json({ stats });

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
