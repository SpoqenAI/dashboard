'use server';

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import {
  searchAvailableNumbers,
  provisionPhoneNumber,
  deletePhoneNumber,
} from '../twilio/provision-number';
import { isActiveSubscription } from '../paddle';

// Function to create admin Supabase client using service role key for RLS bypass
function createSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing required Supabase environment variables for admin client'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

export async function provisionAssistant(userId: string): Promise<void> {
  'use server';

  const loggerPrefix = 'PHONE_PROVISION';

  let supabase;
  try {
    supabase = createSupabaseAdmin();
  } catch (err) {
    logger.error(loggerPrefix, 'Failed to init supabase admin', err as Error);
    return;
  }

  // Check for active subscription before provisioning
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('current_period_start_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subError) {
    logger.error(loggerPrefix, 'Failed to fetch subscription', subError, {
      userId: logger.maskUserId(userId),
    });
    return;
  }

  if (!subscription || !isActiveSubscription(subscription)) {
    logger.info(
      loggerPrefix,
      'No active subscription, skipping phone provisioning',
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
  greeting: string
): Promise<void> {
  'use server';

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

    // Call Vapi API
    const res = await fetch(
      `https://api.vapi.ai/assistant/${settingsRow.vapi_assistant_id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          name: assistantName,
          model: {
            provider: 'openai',
            model: 'gpt-4.1-nano',
            messages: [
              {
                role: 'system',
                content: greeting,
              },
            ],
          },
          voice: {
            provider: 'deepgram',
            voiceId: 'luna',
          },
        }),
      }
    );

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
