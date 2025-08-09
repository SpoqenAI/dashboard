import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { validateServerContext } from '@/lib/utils';
import { getUserVapiAssistantId } from '@/lib/user-settings';
import { SupabaseClient } from '@supabase/supabase-js';
import planJson from '@/supabase/functions/_shared/vapi-assistant.plan.json';

/**
 * Get the standard analysis plan configuration for VAPI assistants
 * This ensures consistency between assistant creation and updates
 */
export function getStandardAnalysisPlan() {
  return (planJson as any).plan;
}

export function getAnalysisPlanVersion(): string {
  return (planJson as any).version as string;
}

/**
 * Validates assistantId to prevent SSRF attacks
 * Ensures the ID matches a safe pattern before using in URLs
 *
 * @param assistantId - The assistant ID to validate
 * @returns boolean - True if the ID is valid and safe to use in URLs
 */
export function validateAssistantId(assistantId: string): boolean {
  // Input validation
  if (!assistantId || typeof assistantId !== 'string') {
    logger.error(
      'VAPI_ASSISTANT_SECURITY',
      'Invalid assistantId: null, undefined, or non-string value',
      new Error(`Rejected assistantId: ${assistantId}`),
      { assistantId }
    );
    return false;
  }

  // Trim whitespace and check for empty string
  const trimmedId = assistantId.trim();
  if (trimmedId.length === 0) {
    logger.error(
      'VAPI_ASSISTANT_SECURITY',
      'Invalid assistantId: empty string after trimming',
      new Error(`Rejected assistantId: "${assistantId}"`),
      { assistantId }
    );
    return false;
  }

  // Check for common SSRF attack patterns
  const ssrfPatterns = [
    /:\/\//, // Protocol separators (http://, https://, etc.)
    /localhost/i, // Localhost references
    /127\.0\.0\.1/, // Local IP addresses
    /0\.0\.0\.0/, // All interfaces
    /::1/, // IPv6 localhost
    /\.\./, // Directory traversal attempts
    /[<>"']/, // HTML/XML injection attempts
    /\s/, // Whitespace characters
    /[^\x20-\x7E]/, // Non-printable ASCII characters
  ];

  for (const pattern of ssrfPatterns) {
    if (pattern.test(trimmedId)) {
      logger.error(
        'VAPI_ASSISTANT_SECURITY',
        'SSRF attack pattern detected in assistantId',
        new Error(`Rejected assistantId with pattern ${pattern}: ${trimmedId}`),
        { assistantId: trimmedId, pattern: pattern.toString() }
      );
      return false;
    }
  }

  // VAPI assistant IDs are typically alphanumeric with dashes/underscores
  // This regex is more restrictive and explicit about allowed characters
  // Only allows lowercase letters, numbers, dashes, and underscores
  // Length between 8 and 64 characters
  const isValidAssistantId = /^[a-z0-9\-_]{8,64}$/.test(trimmedId);

  if (!isValidAssistantId) {
    logger.error(
      'VAPI_ASSISTANT_SECURITY',
      'Invalid assistantId format detected - potential SSRF attempt',
      new Error(`Rejected assistantId: ${trimmedId}`),
      {
        assistantId: trimmedId,
        length: trimmedId.length,
        allowedPattern: 'a-z, 0-9, -, _ (8-64 chars)',
      }
    );
  }

  return isValidAssistantId;
}

/**
 * Safely constructs a VAPI assistant URL with validated assistantId
 * Provides an additional layer of security against SSRF attacks
 *
 * @param assistantId - The assistant ID to include in the URL
 * @param endpoint - The specific endpoint (e.g., '', '/calls', etc.)
 * @returns string - The safe URL or throws an error if validation fails
 */
export function constructSafeVapiUrl(
  assistantId: string,
  endpoint: string = ''
): string {
  // Validate the assistantId before using it in URL construction
  if (!validateAssistantId(assistantId)) {
    throw new Error(`Invalid assistantId format: ${assistantId}`);
  }

  // Define allowed endpoints for better security
  const allowedEndpoints = ['', '/calls', '/logs'];
  if (endpoint && !allowedEndpoints.includes(endpoint)) {
    throw new Error(`Invalid endpoint: ${endpoint}`);
  }
  const safeEndpoint = endpoint;

  // Construct the URL with explicit validation
  const baseUrl = 'https://api.vapi.ai/assistant';
  const safeUrl = `${baseUrl}/${assistantId}${safeEndpoint}`;

  // Additional safety check: ensure the URL doesn't contain any suspicious patterns
  if (safeUrl.includes('://') && !safeUrl.startsWith('https://api.vapi.ai/')) {
    throw new Error(`Invalid URL construction detected: ${safeUrl}`);
  }

  return safeUrl;
}

/**
 * USER-SCOPED VAPI ASSISTANT UTILITIES
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
 * - Must validate user's authorization to access the requested assistant
 * - Must pass only validated parameters (e.g., authenticated user's assistant ID)
 * - Must handle assistant ownership verification before calling admin functions
 *
 * **IMPORTANT**: Never call admin functions directly from client-side code or
 * unauthenticated contexts. They should only be used from:
 * - Authenticated API routes
 * - Server-side functions with proper auth checks
 * - Webhook handlers processing trusted VAPI events
 *
 * **RECOMMENDED**: Use user-scoped alternatives (getUserAssistantInfo, updateUserAssistant)
 * whenever possible as they handle authentication internally and are inherently safer.
 */

/**
 * =============================================================================
 * 🚀 RECOMMENDED USER-SCOPED FUNCTIONS (Use These First!)
 *
 * These functions provide safe, authenticated access to VAPI assistant operations.
 * They handle authentication and assistant ownership verification internally.
 * =============================================================================
 */

/**
 * Get VAPI assistant info for the authenticated user (RECOMMENDED)
 *
 * This is the safest way to get user's assistant info as it handles authentication
 * and ownership verification internally. Use this instead of getAssistantOwnerUserId
 * whenever you have an authenticated Supabase client available.
 *
 * @param supabase - Authenticated Supabase client (from createClient())
 * @returns Promise<{ data: any, error?: string }> - Assistant data or error
 */
export async function getUserAssistantInfo(
  supabase: SupabaseClient
): Promise<{ data: any; error?: string }> {
  try {
    // Get user's assistant ID using user-scoped function
    const assistantResult = await getUserVapiAssistantId(supabase);

    if (assistantResult.error) {
      return { data: null, error: assistantResult.error };
    }

    const assistantId = assistantResult.data;
    if (!assistantId) {
      return { data: null, error: 'No assistant found for user' };
    }

    // Validate assistantId before using in API request to prevent SSRF
    if (!validateAssistantId(assistantId)) {
      return { data: null, error: 'Invalid assistantId format' };
    }

    // Check for VAPI API key
    const apiKey = process.env.VAPI_PRIVATE_KEY;
    if (!apiKey) {
      return {
        data: null,
        error: 'Server misconfiguration – missing VAPI_PRIVATE_KEY',
      };
    }

    // Fetch assistant from VAPI API using safe URL construction
    const safeUrl = constructSafeVapiUrl(assistantId);
    const vapiResponse = await fetch(safeUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!vapiResponse.ok) {
      const errorText = await vapiResponse.text();
      logger.error(
        'VAPI_ASSISTANT',
        'Failed to fetch assistant from VAPI',
        new Error(errorText),
        {
          status: vapiResponse.status,
          assistantId,
        }
      );
      return { data: null, error: 'Failed to fetch assistant from VAPI' };
    }

    const assistantData = await vapiResponse.json();
    return { data: assistantData };
  } catch (error) {
    logger.error(
      'VAPI_ASSISTANT',
      'Failed to get user assistant info',
      error instanceof Error ? error : new Error(String(error))
    );
    return { data: null, error: 'Failed to get assistant info' };
  }
}

/**
 * Update VAPI assistant for the authenticated user (RECOMMENDED)
 *
 * This is the safest way to update user's assistant as it handles authentication
 * and ownership verification internally. Use this instead of admin functions
 * whenever you have an authenticated Supabase client available.
 *
 * @param supabase - Authenticated Supabase client (from createClient())
 * @param assistantId - The assistant ID to update (will be verified against user's assistant)
 * @param updates - The updates to apply to the assistant
 * @returns Promise<{ data: any, error?: string }> - Success response or error
 */
export async function updateUserAssistant(
  supabase: SupabaseClient,
  assistantId: string,
  updates: any
): Promise<{ data: any; error?: string }> {
  try {
    // Verify user owns this assistant and get trusted assistantId from database
    const verificationResult = await verifyUserOwnsAssistant(
      supabase,
      assistantId
    );

    if (verificationResult.error) {
      return { data: null, error: verificationResult.error };
    }

    if (!verificationResult.isOwner) {
      return { data: null, error: 'Assistant not found or access denied' };
    }

    // Get the trusted assistantId from user settings (not user-provided input)
    const assistantResult = await getUserVapiAssistantId(supabase);
    if (assistantResult.error) {
      return { data: null, error: assistantResult.error };
    }

    const trustedAssistantId = assistantResult.data;
    if (!trustedAssistantId) {
      return { data: null, error: 'No assistant found for user' };
    }

    // Validate the trusted assistantId format (defense in depth)
    if (!validateAssistantId(trustedAssistantId)) {
      logger.error(
        'VAPI_ASSISTANT_SECURITY',
        'Invalid trusted assistantId format in database',
        new Error(
          `Database contains invalid assistantId: ${trustedAssistantId}`
        ),
        { trustedAssistantId }
      );
      return { data: null, error: 'Invalid assistant configuration' };
    }

    // Check for VAPI API key
    const vapiApiKey = process.env.VAPI_PRIVATE_KEY;
    if (!vapiApiKey) {
      return {
        data: null,
        error: 'Server misconfiguration – missing VAPI_PRIVATE_KEY',
      };
    }

    // Update assistant via VAPI API using trusted assistantId (no user input in URL)
    const safeUrl = constructSafeVapiUrl(trustedAssistantId);
    const vapiResponse = await fetch(safeUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${vapiApiKey}`,
      },
      body: JSON.stringify(updates),
    });

    if (!vapiResponse.ok) {
      const errorText = await vapiResponse.text();
      logger.error(
        'VAPI_ASSISTANT',
        'Failed to update assistant in VAPI',
        new Error(errorText),
        {
          status: vapiResponse.status,
          trustedAssistantId,
        }
      );
      return { data: null, error: 'Failed to update assistant in VAPI' };
    }

    const updatedAssistant = await vapiResponse.json();

    logger.info('VAPI_ASSISTANT', 'Assistant updated successfully', {
      trustedAssistantId,
      updateFields: Object.keys(updates),
    });

    return { data: updatedAssistant };
  } catch (error) {
    logger.error(
      'VAPI_ASSISTANT',
      'Failed to update user assistant',
      error instanceof Error ? error : new Error(String(error))
    );
    return { data: null, error: 'Failed to update assistant' };
  }
}

/**
 * Verify user owns the specified assistant (RECOMMENDED)
 *
 * This function verifies that the authenticated user owns the specified assistant
 * by checking their user settings.
 *
 * @param supabase - Authenticated Supabase client (from createClient())
 * @param assistantId - The assistant ID to verify ownership of
 * @returns Promise<{ isOwner: boolean, error?: string }> - Ownership verification result
 */
export async function verifyUserOwnsAssistant(
  supabase: SupabaseClient,
  assistantId: string
): Promise<{ isOwner: boolean; error?: string }> {
  try {
    // Get user's assistant ID using user-scoped function
    const assistantResult = await getUserVapiAssistantId(supabase);

    if (assistantResult.error) {
      return { isOwner: false, error: assistantResult.error };
    }

    const userAssistantId = assistantResult.data;
    const isOwner = userAssistantId === assistantId;

    return { isOwner };
  } catch (error) {
    logger.error(
      'VAPI_ASSISTANT',
      'Failed to verify assistant ownership',
      error instanceof Error ? error : new Error(String(error))
    );
    return { isOwner: false, error: 'Failed to verify assistant ownership' };
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
 * Get assistant owner user ID using admin privileges
 *
 * ⚠️  CAUTION: This function uses admin privileges and bypasses authentication.
 * 🚀 RECOMMENDED: Use verifyUserOwnsAssistant() instead for safer, authenticated access.
 *
 * SECURITY: This function uses admin privileges and assumes the caller has:
 * 1. Already authenticated appropriately for admin access
 * 2. Will use the returned user ID responsibly
 * 3. Will not expose cross-user data inappropriately
 *
 * This function is useful for webhook handlers and admin operations that need
 * to find which user owns a specific assistant.
 *
 * @param assistantId - The assistant ID to find the owner for
 * @returns Promise<string | null> - User ID that owns the assistant, or null if not found
 */
export async function getAssistantOwnerUserId(
  assistantId: string
): Promise<string | null> {
  validateServerContext('getAssistantOwnerUserId', 'vapi-assistant');

  // Validate assistantId before using in database query to prevent injection
  if (!validateAssistantId(assistantId)) {
    logger.error(
      'VAPI_ASSISTANT_SECURITY',
      'Invalid assistantId format detected in getAssistantOwnerUserId',
      new Error(`Rejected assistantId: ${assistantId}`),
      { assistantId }
    );
    return null;
  }

  const supabase = createSupabaseAdmin();

  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('id')
      .eq('vapi_assistant_id', assistantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw error;
    }

    return data?.id || null;
  } catch (error) {
    logger.error(
      'VAPI_ASSISTANT',
      'Failed to get assistant owner user ID',
      error instanceof Error ? error : new Error(String(error)),
      {
        assistantId,
      }
    );
    throw error;
  }
}
