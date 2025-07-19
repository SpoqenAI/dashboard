import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function getCustomerId(): Promise<string> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      logger.error('GET_CUSTOMER_ID', 'Failed to get user', userError, {
        errorCode: userError.message,
      });
      throw new Error('Failed to get user information');
    }

    if (!user?.email) {
      logger.debug('GET_CUSTOMER_ID', 'No user email found', {
        userId: logger.maskUserId(user?.id),
      });
      return '';
    }

    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('customer_id, email')
      .eq('email', user.email)
      .single();

    if (customerError) {
      logger.error(
        'GET_CUSTOMER_ID',
        'Failed to fetch customer data',
        customerError,
        {
          userEmail: logger.maskEmail(user.email),
          errorCode: customerError.code,
        }
      );
      throw new Error('Failed to fetch customer information');
    }

    if (!customerData) {
      logger.debug('GET_CUSTOMER_ID', 'No customer data found', {
        userEmail: logger.maskEmail(user.email),
      });
      return '';
    }

    // Type-safe check for customer_id
    if (
      typeof customerData.customer_id !== 'string' ||
      !customerData.customer_id.trim()
    ) {
      logger.warn('GET_CUSTOMER_ID', 'Invalid customer_id format', {
        userEmail: logger.maskEmail(user.email),
        customerIdType: typeof customerData.customer_id,
        customerIdValue: customerData.customer_id ? 'present' : 'missing',
      });
      return '';
    }

    logger.debug('GET_CUSTOMER_ID', 'Successfully retrieved customer ID', {
      userEmail: logger.maskEmail(user.email),
      customerId: customerData.customer_id,
    });

    return customerData.customer_id;
  } catch (error) {
    logger.error(
      'GET_CUSTOMER_ID',
      'Unexpected error in getCustomerId',
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}
