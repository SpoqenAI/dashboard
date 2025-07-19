import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

export interface PaddleTransaction {
  id: string;
  status: string;
  customer_id: string | null;
  address_id: string | null;
  business_id: string | null;
  currency_code: string;
  subscription_id: string | null;
  origin: string;
  collection_mode: string;
  discount_id: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
  details: any;
  items: any;
  payments: any;
  checkout: any;
  billing_details: any;
  custom_data: any;
  created_at: string;
  updated_at: string;
  billed_at: string | null;
  revised_at: string | null;
}

/**
 * Get transactions for a specific customer from Paddle
 */
export async function getTransactionsByCustomerId(
  customerId: string,
  options: {
    limit?: number;
    status?: string[];
    includeSubscriptionTransactions?: boolean;
  } = {}
): Promise<PaddleTransaction[]> {
  const supabase = createSupabaseAdmin();

  try {
    let query = supabase
      .from('paddle.transactions')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.status && options.status.length > 0) {
      query = query.in('status', options.status);
    }

    if (options.includeSubscriptionTransactions === false) {
      query = query.is('subscription_id', null);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error(
      'PADDLE_TRANSACTIONS',
      'Failed to fetch transactions by customer ID',
      error instanceof Error ? error : new Error(String(error)),
      {
        customerId,
        options,
      }
    );
    throw error;
  }
}

/**
 * Get transactions for a specific subscription from Paddle
 */
export async function getTransactionsBySubscriptionId(
  subscriptionId: string,
  options: {
    limit?: number;
    status?: string[];
  } = {}
): Promise<PaddleTransaction[]> {
  const supabase = createSupabaseAdmin();

  try {
    let query = supabase
      .from('paddle.transactions')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .order('created_at', { ascending: false });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.status && options.status.length > 0) {
      query = query.in('status', options.status);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error(
      'PADDLE_TRANSACTIONS',
      'Failed to fetch transactions by subscription ID',
      error instanceof Error ? error : new Error(String(error)),
      {
        subscriptionId,
        options,
      }
    );
    throw error;
  }
}

/**
 * Get a specific transaction by ID from Paddle
 */
export async function getTransactionById(
  transactionId: string
): Promise<PaddleTransaction | null> {
  const supabase = createSupabaseAdmin();

  try {
    const { data, error } = await supabase
      .from('paddle.transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    logger.error(
      'PADDLE_TRANSACTIONS',
      'Failed to fetch transaction by ID',
      error instanceof Error ? error : new Error(String(error)),
      {
        transactionId,
      }
    );
    throw error;
  }
}

/**
 * Get recent transactions across all customers
 */
export async function getRecentTransactions(
  options: {
    limit?: number;
    days?: number;
    status?: string[];
    includeSubscriptionTransactions?: boolean;
  } = {}
): Promise<PaddleTransaction[]> {
  const supabase = createSupabaseAdmin();

  try {
    let query = supabase
      .from('paddle.transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.days) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - options.days);
      query = query.gte('created_at', daysAgo.toISOString());
    }

    if (options.status && options.status.length > 0) {
      query = query.in('status', options.status);
    }

    if (options.includeSubscriptionTransactions === false) {
      query = query.is('subscription_id', null);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error(
      'PADDLE_TRANSACTIONS',
      'Failed to fetch recent transactions',
      error instanceof Error ? error : new Error(String(error)),
      {
        options,
      }
    );
    throw error;
  }
}

/**
 * Get transaction statistics for reporting
 */
export async function getTransactionStats(
  options: {
    days?: number;
    customerId?: string;
    subscriptionId?: string;
  } = {}
): Promise<{
  total_count: number;
  completed_count: number;
  total_revenue: number;
  currencies: Record<string, number>;
}> {
  const supabase = createSupabaseAdmin();

  try {
    let query = supabase
      .from('paddle.transactions')
      .select('status, currency_code, details');

    if (options.days) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - options.days);
      query = query.gte('created_at', daysAgo.toISOString());
    }

    if (options.customerId) {
      query = query.eq('customer_id', options.customerId);
    }

    if (options.subscriptionId) {
      query = query.eq('subscription_id', options.subscriptionId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const stats = {
      total_count: data?.length || 0,
      completed_count: 0,
      total_revenue: 0,
      currencies: {} as Record<string, number>,
    };

    data?.forEach(transaction => {
      if (transaction.status === 'completed') {
        stats.completed_count++;

        // Extract total amount from details JSON
        const total = transaction.details?.totals?.total;
        if (total) {
          const amount = parseFloat(total) / 100; // Convert from cents to main currency unit
          stats.total_revenue += amount;

          const currency = transaction.currency_code || 'USD';
          stats.currencies[currency] =
            (stats.currencies[currency] || 0) + amount;
        }
      }
    });

    return stats;
  } catch (error) {
    logger.error(
      'PADDLE_TRANSACTIONS',
      'Failed to fetch transaction stats',
      error instanceof Error ? error : new Error(String(error)),
      {
        options,
      }
    );
    throw error;
  }
}
