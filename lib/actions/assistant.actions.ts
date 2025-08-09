'use server';

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { createSupabaseAdmin } from '../supabase/admin';
import {
  searchAvailableNumbers,
  provisionPhoneNumber,
  deletePhoneNumber,
} from '../twilio/provision-number';
import { isActiveSubscription } from '../paddle';
import {
  validateAssistantId,
  getStandardAnalysisPlan,
} from '@/lib/vapi-assistant';

/**
 * Safely constructs a VAPI assistant URL with validated assistantId
 * Provides an additional layer of security against SSRF attacks
 *
 * @param assistantId - The assistant ID to include in the URL
 * @param endpoint - The specific endpoint (e.g., '', '/calls', etc.)
 * @returns string - The safe URL or throws an error if validation fails
 */
function constructSafeVapiUrl(
  assistantId: string,
  endpoint: string = ''
): string {
  // Validate the assistantId before using it in URL construction
  if (!validateAssistantId(assistantId)) {
    throw new Error(`Invalid assistantId format: ${assistantId}`);
  }

  // Ensure endpoint is safe (only alphanumeric, dashes, underscores, and forward slashes)
  const safeEndpoint = endpoint.replace(/[^a-zA-Z0-9\-_\/]/g, '');

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
 * Runtime safeguard to ensure admin functions are only called from server contexts
 * @param functionName - Name of the function being called for logging
 */
function validateServerContext(functionName: string): void {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    const error = new Error(
      `Security violation: ${functionName} called from client-side code. ` +
        'Admin assistant action functions must only be used in server contexts.'
    );
    logger.error(
      'ASSISTANT_ACTIONS_SECURITY',
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
      'ASSISTANT_ACTIONS_SECURITY',
      'Admin function called without server environment',
      error,
      { functionName }
    );
    throw error;
  }

  // Log usage for audit trail
  logger.info(
    'ASSISTANT_ACTIONS_ADMIN',
    `Admin function called: ${functionName}`,
    {
      functionName,
      serverContext: true,
    }
  );
}

export async function provisionAssistant(userId: string): Promise<void> {
  'use server';
  validateServerContext('provisionAssistant');

  const loggerPrefix = 'PHONE_PROVISION';

  let supabase;
  try {
    supabase = createSupabaseAdmin();
  } catch (err) {
    logger.error(loggerPrefix, 'Failed to init supabase admin', err as Error);
    return;
  }

  // Check for current subscription before provisioning
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('current', true)
    .order('current_period_start_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subError) {
    logger.error(loggerPrefix, 'Failed to fetch subscription', subError, {
      userId: logger.maskUserId(userId),
    });
    return;
  }

  // Only provision phone numbers for paid subscriptions
  // Free users can use everything except the actual phone number
  if (!subscription || !isActiveSubscription(subscription)) {
    logger.info(
      loggerPrefix,
      'No active paid subscription, skipping phone provisioning (free users can use widget)',
      {
        userId: logger.maskUserId(userId),
        subscriptionStatus: subscription?.status,
      }
    );
    return;
  }

  // 1️⃣  If user already has an active number, skip
  const { data: existingNumber } = await supabase
    .from('phone_numbers')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (existingNumber) {
    logger.info(loggerPrefix, 'Phone number already provisioned', {
      userId: logger.maskUserId(userId),
    });
    return;
  }

  // 2️⃣  Provision Twilio number using REST API utility
  const isDev = process.env.NODE_ENV === 'development';
  let provisioned;
  try {
    if (isDev) {
      provisioned = await provisionPhoneNumber('+15005550006');
    } else {
      const available = await searchAvailableNumbers('415');
      const firstNumber = available.available_phone_numbers?.[0];
      if (!firstNumber) {
        logger.error(loggerPrefix, 'No Twilio numbers available');
        return;
      }
      provisioned = await provisionPhoneNumber(firstNumber.phone_number);
    }
  } catch (err) {
    logger.error(
      loggerPrefix,
      'Failed to provision Twilio number',
      err as Error,
      {
        userId: logger.maskUserId(userId),
      }
    );
    return;
  }

  // 3️⃣  Upsert phone_numbers
  const { error } = await supabase.from('phone_numbers').upsert(
    {
      user_id: userId,
      provider: 'twilio',
      provider_number_id: provisioned.sid,
      e164_number: provisioned.phone_number || provisioned.phoneNumber,
      status: 'active',
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    logger.error(loggerPrefix, 'Failed to upsert phone_numbers', error, {
      userId: logger.maskUserId(userId),
    });
    return;
  }

  logger.info(loggerPrefix, 'Provisioned phone number', {
    userId: logger.maskUserId(userId),
    number: provisioned.phone_number || provisioned.phoneNumber,
  });
}

export async function syncVapiAssistant(
  userId: string,
  assistantName: string,
  greeting: string,
  voiceId?: string
): Promise<void> {
  'use server';
  validateServerContext('syncVapiAssistant');

  // Log the start of the sync so we can trace if the function is invoked at all
  logger.info('VAPI_SYNC', 'Starting assistant sync', {
    userId: logger.maskUserId(userId),
    assistantName,
  });

  try {
    // Skip if values empty (defensive no-op)
    if (!assistantName || !greeting) {
      logger.warn('VAPI_SYNC', 'assistantName or greeting empty – skipping', {
        assistantNameLength: assistantName?.length ?? 0,
        greetingLength: greeting?.length ?? 0,
      });
      return;
    }

    // Create admin client – wrap in try so missing env vars are caught locally
    let supabase;
    try {
      supabase = createSupabaseAdmin();
    } catch (envErr) {
      logger.error(
        'VAPI_SYNC',
        'Failed to create Supabase admin client',
        envErr as Error,
        {
          userId: logger.maskUserId(userId),
        }
      );
      return; // Early exit – nothing else to do without DB access
    }

    const { data: settingsRow } = await supabase
      .from('user_settings')
      .select('vapi_assistant_id')
      .eq('id', userId)
      .maybeSingle();

    if (!settingsRow || !settingsRow.vapi_assistant_id) {
      logger.warn('VAPI_SYNC', 'No Vapi assistant ID found; skipping sync', {
        userId: logger.maskUserId(userId),
      });
      return;
    }

    const apiKey = process.env.VAPI_PRIVATE_KEY;
    if (!apiKey) {
      logger.error('VAPI_SYNC', 'Missing VAPI_PRIVATE_KEY env var', undefined, {
        userId: logger.maskUserId(userId),
      });
      return;
    }

    // Validate assistantId before using in API request to prevent SSRF
    const assistantId = settingsRow.vapi_assistant_id;
    if (!assistantId || !validateAssistantId(assistantId)) {
      logger.error(
        'VAPI_SYNC_SECURITY',
        'Invalid assistantId format detected',
        new Error(`Rejected assistantId: ${assistantId}`),
        { assistantId, userId: logger.maskUserId(userId) }
      );
      return;
    }

    // Call Vapi API using safe URL construction
    const safeUrl = constructSafeVapiUrl(assistantId);

    // Fetch existing assistant to preserve current model config (provider/model/temperature/maxTokens/toolIds)
    let existingModel: any = {};
    try {
      const getRes = await fetch(safeUrl, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (getRes.ok) {
        const assistantJson = await getRes.json();
        existingModel = assistantJson?.model || {};
      }
    } catch (_) {
      // Best-effort; proceed without blocking if GET fails
    }

    const res = await fetch(safeUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        name: assistantName,
        // Preserve existing model and only update the system message
        model: {
          ...existingModel,
          messages: [
            {
              role: 'system',
              content: greeting,
            },
          ],
        },
        ...(voiceId
          ? {
              voice: {
                provider: 'deepgram',
                model: 'aura-2',
                voiceId,
              },
            }
          : {}),
        // Standardized analysis plan
        analysisPlan: getStandardAnalysisPlan(),
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Vapi update failed ${res.status}: ${txt}`);
    }

    logger.info('VAPI_SYNC', 'Assistant updated on Vapi', {
      userId: logger.maskUserId(userId),
      assistantName,
    });
  } catch (err) {
    logger.error('VAPI_SYNC', 'Failed to sync assistant', err as Error, {
      userId: logger.maskUserId(userId),
    });
    // Swallow error so caller does not fail
  }
}

export async function deleteTwilioNumberForUser(userId: string): Promise<void> {
  'use server';
  validateServerContext('deleteTwilioNumberForUser');

  const loggerPrefix = 'PHONE_DELETE';
  let supabase;
  try {
    supabase = createSupabaseAdmin();
  } catch (err) {
    logger.error(loggerPrefix, 'Failed to init supabase admin', err as Error);
    return;
  }
  // Find active Twilio number for user
  const { data: phoneRow, error: phoneError } = await supabase
    .from('phone_numbers')
    .select('id, provider_number_id')
    .eq('user_id', userId)
    .eq('provider', 'twilio')
    .eq('status', 'active')
    .maybeSingle();
  if (phoneError) {
    logger.error(loggerPrefix, 'Failed to fetch phone number', phoneError, {
      userId: logger.maskUserId(userId),
    });
    return;
  }
  if (!phoneRow) {
    logger.info(loggerPrefix, 'No active Twilio number to delete', {
      userId: logger.maskUserId(userId),
    });
    return;
  }
  try {
    await deletePhoneNumber(phoneRow.provider_number_id);
    // Mark as released in DB
    const { error: updateError } = await supabase
      .from('phone_numbers')
      .update({ status: 'released', released_at: new Date().toISOString() })
      .eq('id', phoneRow.id);
    if (updateError) {
      logger.error(
        loggerPrefix,
        'Failed to update phone_numbers after deletion',
        updateError,
        {
          userId: logger.maskUserId(userId),
          phoneId: phoneRow.id,
        }
      );
      return;
    }
    logger.info(loggerPrefix, 'Twilio number deleted and marked as released', {
      userId: logger.maskUserId(userId),
      phoneId: phoneRow.id,
    });
  } catch (err) {
    logger.error(loggerPrefix, 'Failed to delete Twilio number', err as Error, {
      userId: logger.maskUserId(userId),
      phoneId: phoneRow.id,
    });
  }
}
