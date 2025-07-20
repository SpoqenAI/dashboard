import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

/**
 * USER-SCOPED USER SETTINGS UTILITIES
 *
 * These utility functions use createSupabaseAdmin() for database access, which provides
 * admin-level privileges that bypass Row Level Security (RLS). This is an intentional
 * design choice following a layered security model:
 *
 * 1. **API Layer Security**: Authentication and authorization are enforced at the API
 *    route level using createClient() from @/lib/supabase/server.
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
 * - Must authenticate the user before calling admin functions
 * - Must validate user's authorization to access the requested data
 * - Must pass only validated parameters (e.g., authenticated user's ID)
 * - Must handle user ID validation before calling admin functions
 *
 * **IMPORTANT**: Never call admin functions directly from client-side code or
 * unauthenticated contexts. They should only be used from:
 * - Authenticated API routes
 * - Server-side functions with proper auth checks
 * - Webhook handlers processing trusted events
 *
 * **RECOMMENDED**: Use user-scoped alternatives (getUserSettings, updateUserSettings)
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
        'Admin user settings functions must only be used in server contexts. ' +
        'Use getUserSettings() or updateUserSettings() for client-accessible operations.'
    );
    logger.error(
      'USER_SETTINGS_SECURITY',
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
      'USER_SETTINGS_SECURITY',
      'Admin function called without server environment',
      error,
      { functionName }
    );
    throw error;
  }

  // Log usage for audit trail
  logger.info('USER_SETTINGS_ADMIN', `Admin function called: ${functionName}`, {
    functionName,
    serverContext: true,
  });
}

/**
 * =============================================================================
 * 🚀 RECOMMENDED USER-SCOPED FUNCTIONS (Use These First!)
 *
 * These functions provide safe, authenticated access to user settings data.
 * They handle authentication internally and are the preferred way to access
 * user settings data in most use cases.
 * =============================================================================
 */

/**
 * Get user settings for the authenticated user (RECOMMENDED)
 *
 * This is the safest way to get user settings as it handles authentication
 * and authorization internally. Use this instead of getUserSettingsByUserId
 * whenever you have an authenticated Supabase client available.
 *
 * @param supabase - Authenticated Supabase client (from createClient())
 * @param options - Query options for selecting specific fields
 * @returns Promise<{ data: any, error?: string }> - User's settings or error
 */
export async function getUserSettings(
  supabase: any, // Type from Supabase client
  options: {
    select?: string;
  } = {}
): Promise<{ data: any; error?: string }> {
  try {
    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: 'User not authenticated' };
    }

    // Build query with optional field selection
    const selectFields = options.select || '*';

    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select(selectFields)
      .eq('id', user.id)
      .single();

    if (settingsError) {
      logger.error(
        'USER_SETTINGS',
        'Failed to fetch user settings',
        settingsError,
        {
          userId: logger.maskUserId(user.id),
          selectFields,
        }
      );
      return { data: null, error: 'Failed to fetch user settings' };
    }

    return { data: settings };
  } catch (error) {
    logger.error(
      'USER_SETTINGS',
      'Failed to get user settings',
      error instanceof Error ? error : new Error(String(error))
    );
    return { data: null, error: 'Failed to get user settings' };
  }
}

/**
 * Update user settings for the authenticated user (RECOMMENDED)
 *
 * This is the safest way to update user settings as it handles authentication
 * and authorization internally. Use this instead of updateUserSettingsByUserId
 * whenever you have an authenticated Supabase client available.
 *
 * @param supabase - Authenticated Supabase client (from createClient())
 * @param updates - Object containing the fields to update
 * @returns Promise<{ data: any, error?: string }> - Updated settings or error
 */
export async function updateUserSettings(
  supabase: any, // Type from Supabase client
  updates: Record<string, any>
): Promise<{ data: any; error?: string }> {
  try {
    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: 'User not authenticated' };
    }

    // Add updated_at timestamp
    const updatesWithTimestamp = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data: settings, error: updateError } = await supabase
      .from('user_settings')
      .update(updatesWithTimestamp)
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      logger.error(
        'USER_SETTINGS',
        'Failed to update user settings',
        updateError,
        {
          userId: logger.maskUserId(user.id),
          updateFields: Object.keys(updates),
        }
      );
      return { data: null, error: 'Failed to update user settings' };
    }

    logger.info('USER_SETTINGS', 'User settings updated successfully', {
      userId: logger.maskUserId(user.id),
      updateFields: Object.keys(updates),
    });

    return { data: settings };
  } catch (error) {
    logger.error(
      'USER_SETTINGS',
      'Failed to update user settings',
      error instanceof Error ? error : new Error(String(error))
    );
    return { data: null, error: 'Failed to update user settings' };
  }
}

/**
 * Get VAPI assistant ID for the authenticated user (RECOMMENDED)
 *
 * This is a specialized function for getting just the VAPI assistant ID,
 * which is commonly needed for VAPI operations. Handles authentication internally.
 *
 * @param supabase - Authenticated Supabase client (from createClient())
 * @returns Promise<{ data: string | null, error?: string }> - Assistant ID or error
 */
export async function getUserVapiAssistantId(
  supabase: any // Type from Supabase client
): Promise<{ data: string | null; error?: string }> {
  try {
    const result = await getUserSettings(supabase, {
      select: 'vapi_assistant_id',
    });

    if (result.error) {
      return { data: null, error: result.error };
    }

    return { data: result.data?.vapi_assistant_id || null };
  } catch (error) {
    logger.error(
      'USER_SETTINGS',
      'Failed to get user VAPI assistant ID',
      error instanceof Error ? error : new Error(String(error))
    );
    return { data: null, error: 'Failed to get VAPI assistant ID' };
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

/**
 * Get user settings by user ID using admin privileges
 *
 * ⚠️  CAUTION: This function uses admin privileges and bypasses authentication.
 * 🚀 RECOMMENDED: Use getUserSettings() instead for safer, authenticated access.
 *
 * SECURITY: This function uses admin privileges and assumes the caller has:
 * 1. Authenticated the user
 * 2. Validated that the caller is authorized to access this user's data
 * 3. Ensured the userId belongs to the authenticated user
 *
 * @param userId - The user ID to fetch settings for
 * @param options - Query options for selecting specific fields
 * @returns Promise<any> - User settings or null if not found
 */
export async function getUserSettingsByUserId(
  userId: string,
  options: {
    select?: string;
  } = {}
): Promise<any> {
  validateServerContext('getUserSettingsByUserId');
  const supabase = createSupabaseAdmin();

  try {
    const selectFields = options.select || '*';

    const { data, error } = await supabase
      .from('user_settings')
      .select(selectFields)
      .eq('id', userId)
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
      'USER_SETTINGS',
      'Failed to fetch user settings by user ID',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: logger.maskUserId(userId),
        selectFields: options.select,
      }
    );
    throw error;
  }
}

/**
 * Update user settings by user ID using admin privileges
 *
 * ⚠️  CAUTION: This function uses admin privileges and bypasses authentication.
 * 🚀 RECOMMENDED: Use updateUserSettings() instead for safer, authenticated access.
 *
 * SECURITY: This function uses admin privileges and assumes the caller has:
 * 1. Authenticated the user
 * 2. Validated that the caller is authorized to update this user's data
 * 3. Ensured the userId belongs to the authenticated user
 *
 * @param userId - The user ID to update settings for
 * @param updates - Object containing the fields to update
 * @returns Promise<any> - Updated user settings
 */
export async function updateUserSettingsByUserId(
  userId: string,
  updates: Record<string, any>
): Promise<any> {
  validateServerContext('updateUserSettingsByUserId');
  const supabase = createSupabaseAdmin();

  try {
    // Add updated_at timestamp
    const updatesWithTimestamp = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('user_settings')
      .update(updatesWithTimestamp)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    logger.info('USER_SETTINGS', 'User settings updated via admin function', {
      userId: logger.maskUserId(userId),
      updateFields: Object.keys(updates),
    });

    return data;
  } catch (error) {
    logger.error(
      'USER_SETTINGS',
      'Failed to update user settings by user ID',
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: logger.maskUserId(userId),
        updateFields: Object.keys(updates),
      }
    );
    throw error;
  }
}
