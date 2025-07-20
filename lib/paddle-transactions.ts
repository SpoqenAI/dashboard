import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { convertAmountFromLowestUnit } from '@/utils/paddle/parse-money';

/**
 * SECURITY ARCHITECTURE NOTE:
 *
 * These utility functions use createSupabaseAdmin() for database access, which provides
 * admin-level privileges that bypass Row Level Security (RLS). This is an intentional
 * design choice following a layered security model:
 *
 * 1. **API Layer Security**: Authentication and authorization are enforced at the API
 *    route level (e.g., /api/paddle/transactions/route.ts) using createClient().
 *
 * 2. **Data Layer Utilities**: These functions assume they are called with pre-validated,
 *    trusted parameters from authenticated API routes.
 *
 * 3. **Separation of Concerns**: This separation allows for:
 *    - Centralized authentication/authorization logic in API routes
 *    - Reusable data access utilities that can be safely called from trusted contexts
 *    - Clear audit trail of security checks in calling code
 *
 * **SECURITY REQUIREMENTS FOR CALLERS**:
 * - Must authenticate the user before calling these functions
 * - Must validate user's authorization to access the requested data
 * - Must pass only validated parameters (e.g., user's own customer_id)
 * - Must handle any customer ID validation/mapping before calling
 *
 * **IMPORTANT**: Never call these functions directly from client-side code or
 * unauthenticated contexts. They should only be used from:
 * - Authenticated API routes
 * - Server-side functions with proper auth checks
 * - Webhook handlers processing trusted Paddle events
 *
 * **RECOMMENDED**: Use user-scoped alternatives (getUserTransactions, getUserTransactionStats)
 * whenever possible as they handle authentication internally and are inherently safer.
 */

/**
 * Runtime safeguard to ensure admin functions are only called from server contexts
 * @param functionName - Name of the function being called for logging
 */
function validateServerContext(functionName: string): void {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    const error = new Error(
      `Security violation: ${functionName} called from client-side code. ` +
        'Admin paddle transaction functions must only be used in server contexts. ' +
        'Use getUserTransactions() or getUserTransactionStats() for client-accessible operations.'
    );
    logger.error(
      'PADDLE_TRANSACTIONS_SECURITY',
      'Admin function called from client context',
      error,
      { functionName }
    );
    throw error;
  }

  // Check for required server environment variables
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const error = new Error(
      `Security violation: ${functionName} requires server environment. ` +
        'Missing SUPABASE_SERVICE_ROLE_KEY indicates this is not a proper server context.'
    );
    logger.error(
      'PADDLE_TRANSACTIONS_SECURITY',
      'Admin function called without server environment',
      error,
      { functionName }
    );
    throw error;
  }

  // Log usage for audit trail
  logger.info(
    'PADDLE_TRANSACTIONS_ADMIN',
    `Admin function called: ${functionName}`,
    {
      functionName,
      serverContext: true,
    }
  );
}

// Specific types for Paddle transaction fields based on actual usage
export interface PaddleTransactionDetails {
  totals?: {
    total?: string;
    subtotal?: string;
    tax?: string;
    discount?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface PaddleTransactionItem {
  price_id: string;
  quantity: number;
  unit_price?: string;
  total?: string;
  description?: string;
  [key: string]: unknown;
}

export interface PaddleTransactionPayment {
  payment_method_id: string;
  amount: string;
  currency_code?: string;
  status?: string;
  [key: string]: unknown;
}

export interface PaddleTransactionCheckout {
  url?: string;
  completed?: boolean;
  [key: string]: unknown;
}

export interface PaddleBillingDetails {
  name?: string;
  email?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

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
  details: PaddleTransactionDetails;
  items: PaddleTransactionItem[];
  payments: PaddleTransactionPayment[];
  checkout: PaddleTransactionCheckout;
  billing_details: PaddleBillingDetails;
  custom_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  billed_at: string | null;
  revised_at: string | null;
}

/**
 * Get transactions for a specific customer from Paddle
 *
 * ⚠️  CAUTION: This function uses admin privileges and bypasses authentication.
 * 🚀 RECOMMENDED: Use getUserTransactions() instead for safer, authenticated access.
 *
 * SECURITY: This function uses admin privileges and assumes the caller has:
 * 1. Authenticated the user
 * 2. Validated that the user is authorized to access this customer's data
 * 3. Ensured the customerId belongs to the authenticated user
 *
 * @param customerId - The Paddle customer ID to fetch transactions for
 * @param options - Query options for filtering transactions
 * @returns Promise<PaddleTransaction[]> - Array of transactions for the customer
 */
export async function getTransactionsByCustomerId(
  customerId: string,
  options: {
    limit?: number;
    status?: string[];
    includeSubscriptionTransactions?: boolean;
  } = {}
): Promise<PaddleTransaction[]> {
  validateServerContext('getTransactionsByCustomerId');
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
 *
 * ⚠️  CAUTION: This function uses admin privileges and bypasses authentication.
 * 🚀 RECOMMENDED: Use getUserTransactions() instead for safer, authenticated access.
 *
 * SECURITY: This function uses admin privileges and assumes the caller has:
 * 1. Authenticated the user
 * 2. Validated that the user owns or is authorized to access this subscription
 * 3. Ensured the subscriptionId belongs to the authenticated user's customer
 *
 * @param subscriptionId - The Paddle subscription ID to fetch transactions for
 * @param options - Query options for filtering transactions
 * @returns Promise<PaddleTransaction[]> - Array of transactions for the subscription
 */
export async function getTransactionsBySubscriptionId(
  subscriptionId: string,
  options: {
    limit?: number;
    status?: string[];
  } = {}
): Promise<PaddleTransaction[]> {
  validateServerContext('getTransactionsBySubscriptionId');
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
 *
 * ⚠️  CAUTION: This function uses admin privileges and bypasses authentication.
 *
 * SECURITY: This function uses admin privileges and assumes the caller has:
 * 1. Authenticated the user
 * 2. Will validate that the returned transaction belongs to the user's customer
 * 3. Will handle authorization checks on the returned data
 *
 * Note: This function returns the transaction regardless of ownership.
 * The caller MUST verify the transaction.customer_id matches the user's customer.
 *
 * @param transactionId - The Paddle transaction ID to fetch
 * @returns Promise<PaddleTransaction | null> - The transaction or null if not found
 */
export async function getTransactionById(
  transactionId: string
): Promise<PaddleTransaction | null> {
  validateServerContext('getTransactionById');
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
 *
 * ⚠️ SECURITY WARNING: This function can return transactions from ANY customer.
 * It should only be used in admin contexts or with proper filtering.
 * 🚀 RECOMMENDED: Use getUserTransactions() for user-specific queries.
 *
 * SECURITY: This function uses admin privileges and assumes the caller:
 * 1. Has admin privileges OR will filter results appropriately
 * 2. Will not expose cross-customer data to unauthorized users
 *
 * Consider using getUserTransactions() for user-specific queries.
 *
 * @param options - Query options for filtering transactions
 * @returns Promise<PaddleTransaction[]> - Array of recent transactions
 */
export async function getRecentTransactions(
  options: {
    limit?: number;
    days?: number;
    status?: string[];
    includeSubscriptionTransactions?: boolean;
  } = {}
): Promise<PaddleTransaction[]> {
  validateServerContext('getRecentTransactions');
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
 *
 * ⚠️  CAUTION: This function uses admin privileges and bypasses authentication.
 * 🚀 RECOMMENDED: Use getUserTransactionStats() instead for safer, authenticated access.
 *
 * SECURITY: This function uses admin privileges and assumes the caller has:
 * 1. Authenticated the user (if customerId/subscriptionId provided)
 * 2. Validated authorization for the specified customer/subscription
 * 3. Ensured the customer/subscription belongs to the authenticated user
 *
 * When called without customerId/subscriptionId, this returns global stats
 * and should only be used in admin contexts.
 *
 * @param options - Query options for filtering statistics
 * @returns Promise<TransactionStats> - Aggregated transaction statistics
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
  validateServerContext('getTransactionStats');
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
          const currency = transaction.currency_code || 'USD';
          const amount = convertAmountFromLowestUnit(
            total.toString(),
            currency
          );
          stats.total_revenue += amount;

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

/**
 * =============================================================================
 * 🚀 RECOMMENDED USER-SCOPED FUNCTIONS (Use These First!)
 *
 * These functions provide safe, authenticated access to paddle transaction data.
 * They handle authentication internally and are the preferred way to access
 * transaction data in most use cases.
 * =============================================================================
 */

/**
 * Get transactions for the authenticated user's customer (RECOMMENDED)
 *
 * This is the safest way to get user transactions as it handles authentication
 * and authorization internally. Use this instead of getTransactionsByCustomerId
 * whenever you have an authenticated Supabase client available.
 *
 * @param supabase - Authenticated Supabase client (from createClient())
 * @param options - Query options for filtering transactions
 * @returns Promise<{ data: PaddleTransaction[], error?: string }> - User's transactions or error
 */
export async function getUserTransactions(
  supabase: any, // Type from Supabase client
  options: {
    limit?: number;
    status?: string[];
    includeSubscriptionTransactions?: boolean;
  } = {}
): Promise<{ data: PaddleTransaction[]; error?: string }> {
  try {
    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: [], error: 'User not authenticated' };
    }

    // Get user's customer ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('paddle_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.paddle_customer_id) {
      return { data: [], error: 'User profile or customer ID not found' };
    }

    // Use the admin function with validated customer ID
    const transactions = await getTransactionsByCustomerId(
      profile.paddle_customer_id,
      options
    );

    return { data: transactions };
  } catch (error) {
    logger.error(
      'PADDLE_TRANSACTIONS',
      'Failed to fetch user transactions',
      error instanceof Error ? error : new Error(String(error))
    );
    return { data: [], error: 'Failed to fetch transactions' };
  }
}

/**
 * Get transaction statistics for the authenticated user (RECOMMENDED)
 *
 * This is the safest way to get user transaction stats as it handles authentication
 * and authorization internally. Use this instead of getTransactionStats
 * whenever you have an authenticated Supabase client available.
 *
 * @param supabase - Authenticated Supabase client (from createClient())
 * @param options - Query options for filtering statistics
 * @returns Promise<{ data: TransactionStats, error?: string }> - User's stats or error
 */
export async function getUserTransactionStats(
  supabase: any, // Type from Supabase client
  options: {
    days?: number;
  } = {}
): Promise<{
  data: {
    total_count: number;
    completed_count: number;
    total_revenue: number;
    currencies: Record<string, number>;
  } | null;
  error?: string;
}> {
  try {
    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: 'User not authenticated' };
    }

    // Get user's customer ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('paddle_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.paddle_customer_id) {
      return { data: null, error: 'User profile or customer ID not found' };
    }

    // Use the admin function with validated customer ID
    const stats = await getTransactionStats({
      customerId: profile.paddle_customer_id,
      days: options.days,
    });

    return { data: stats };
  } catch (error) {
    logger.error(
      'PADDLE_TRANSACTIONS',
      'Failed to fetch user transaction stats',
      error instanceof Error ? error : new Error(String(error))
    );
    return { data: null, error: 'Failed to fetch transaction statistics' };
  }
}

/**
 * =============================================================================
 * ⚠️  ADMIN FUNCTIONS - USE WITH EXTREME CAUTION
 *
 * These functions bypass authentication and should only be used in trusted
 * server contexts. Prefer the user-scoped functions above whenever possible.
 * =============================================================================
 */
