'use server';

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

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

  // 2️⃣  Provision Twilio number
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;

  if (!twilioAccountSid || !twilioAuthToken) {
    logger.error(loggerPrefix, 'Missing Twilio env vars');
    return;
  }

  const { default: twilio } = await import('twilio');
  const client = twilio(twilioAccountSid, twilioAuthToken);

  const isDev = process.env.NODE_ENV === 'development';
  let provisioned;
  if (isDev) {
    provisioned = await client.incomingPhoneNumbers.create({
      phoneNumber: '+15005550006',
      voiceUrl: 'http://demo.twilio.com/docs/voice.xml',
    });
  } else {
    const available = await client
      .availablePhoneNumbers('US')
      .local.list({ voiceEnabled: true, limit: 1 });

    if (!available.length) {
      logger.error(loggerPrefix, 'No Twilio numbers available');
      return;
    }

    provisioned = await client.incomingPhoneNumbers.create({
      phoneNumber: available[0].phoneNumber,
    });
  }

  // 3️⃣  Upsert phone_numbers
  const { error } = await supabase.from('phone_numbers').upsert(
    {
      user_id: userId,
      provider: 'twilio',
      provider_number_id: provisioned.sid,
      e164_number: provisioned.phoneNumber,
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
    number: provisioned.phoneNumber,
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
