import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import {
  getUserVapiAssistantId,
  updateUserSettings,
} from '@/lib/user-settings';

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
 * Runtime safeguard to ensure admin functions are only called from server contexts
 * @param functionName - Name of the function being called for logging
 */
function validateServerContext(functionName: string): void {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    const error = new Error(
      `Security violation: ${functionName} called from client-side code. ` +
        'Admin VAPI assistant functions must only be used in server contexts. ' +
        'Use getUserAssistantInfo() or updateUserAssistant() for client-accessible operations.'
    );
    logger.error(
      'VAPI_ASSISTANT_SECURITY',
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
      'VAPI_ASSISTANT_SECURITY',
      'Admin function called without server environment',
      error,
      { functionName }
    );
    throw error;
  }

  // Log usage for audit trail
  logger.info(
    'VAPI_ASSISTANT_ADMIN',
    `Admin function called: ${functionName}`,
    {
      functionName,
      serverContext: true,
    }
  );
}

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
  supabase: any // Type from Supabase client
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

    // Check for VAPI API key
    const apiKey = process.env.VAPI_PRIVATE_KEY;
    if (!apiKey) {
      return {
        data: null,
        error: 'Server misconfiguration – missing VAPI_PRIVATE_KEY',
      };
    }

    // Fetch assistant from VAPI API
    const vapiResponse = await fetch(
      `https://api.vapi.ai/assistant/${assistantId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

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
  supabase: any, // Type from Supabase client
  assistantId: string,
  updates: any
): Promise<{ data: any; error?: string }> {
  try {
    // Verify user owns this assistant
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

    // Check for VAPI API key
    const vapiApiKey = process.env.VAPI_PRIVATE_KEY;
    if (!vapiApiKey) {
      return {
        data: null,
        error: 'Server misconfiguration – missing VAPI_PRIVATE_KEY',
      };
    }

    // Update assistant via VAPI API
    const vapiResponse = await fetch(
      `https://api.vapi.ai/assistant/${assistantId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vapiApiKey}`,
        },
        body: JSON.stringify(updates),
      }
    );

    if (!vapiResponse.ok) {
      const errorText = await vapiResponse.text();
      logger.error(
        'VAPI_ASSISTANT',
        'Failed to update assistant in VAPI',
        new Error(errorText),
        {
          status: vapiResponse.status,
          assistantId,
        }
      );
      return { data: null, error: 'Failed to update assistant in VAPI' };
    }

    const updatedAssistant = await vapiResponse.json();

    logger.info('VAPI_ASSISTANT', 'Assistant updated successfully', {
      assistantId,
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
 * Create VAPI assistant for the authenticated user (RECOMMENDED)
 *
 * This is the safest way to create an assistant as it handles authentication
 * and user settings updates internally.
 *
 * @param supabase - Authenticated Supabase client (from createClient())
 * @param assistantData - The assistant configuration to create
 * @returns Promise<{ data: { assistantId: string }, error?: string }> - Created assistant ID or error
 */
export async function createUserAssistant(
  supabase: any, // Type from Supabase client
  assistantData: {
    assistantName: string;
    greeting: string;
    [key: string]: any;
  }
): Promise<{ data: { assistantId: string } | null; error?: string }> {
  try {
    // Check for required environment variables
    const vapiApiKey = process.env.VAPI_PRIVATE_KEY;
    const vapiWebhookSecret = process.env.VAPI_WEBHOOK_SECRET;
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;

    if (!vapiApiKey || !vapiWebhookSecret || !appUrl) {
      return {
        data: null,
        error: 'Server misconfiguration – missing VAPI environment variables',
      };
    }

    // Create assistant via VAPI API
    const vapiResponse = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${vapiApiKey}`,
      },
      body: JSON.stringify({
        name: assistantData.assistantName,
        model: {
          provider: 'openai',
          model: 'gpt-4.1-nano',
          messages: [
            {
              role: 'system',
              content: assistantData.greeting,
            },
          ],
        },
        voice: {
          provider: 'deepgram',
          voiceId: 'luna',
        },
        serverUrl: `${appUrl}/api/webhooks/vapi`,
        serverUrlSecret: vapiWebhookSecret,
        ...assistantData,
      }),
    });

    if (!vapiResponse.ok) {
      const errorText = await vapiResponse.text();
      logger.error(
        'VAPI_ASSISTANT',
        'Failed to create assistant in VAPI',
        new Error(errorText),
        {
          status: vapiResponse.status,
        }
      );
      return { data: null, error: 'Failed to create assistant in VAPI' };
    }

    const createdAssistant = await vapiResponse.json();
    const assistantId = createdAssistant.id;

    // Save assistant ID to user settings using user-scoped function
    const updateResult = await updateUserSettings(supabase, {
      vapi_assistant_id: assistantId,
    });

    if (updateResult.error) {
      // Assistant was created but we couldn't save the ID - log warning but still return success
      logger.warn(
        'VAPI_ASSISTANT',
        'Assistant created but failed to save ID to user settings',
        {
          assistantId,
          error: updateResult.error,
        }
      );
    }

    logger.info('VAPI_ASSISTANT', 'Assistant created successfully', {
      assistantId,
    });

    return { data: { assistantId } };
  } catch (error) {
    logger.error(
      'VAPI_ASSISTANT',
      'Failed to create user assistant',
      error instanceof Error ? error : new Error(String(error))
    );
    return { data: null, error: 'Failed to create assistant' };
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
  supabase: any, // Type from Supabase client
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
  validateServerContext('getAssistantOwnerUserId');
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
