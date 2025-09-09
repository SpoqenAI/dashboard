/**
 * Supabase Edge Function: phone-number-provision
 *
 * This function handles phone number provisioning triggered by database changes.
 * It integrates with Twilio for phone number search and provisioning, and links
 * numbers to VAPI assistants.
 *
 * Key features:
 * - Programmatic Twilio phone number search (ANY available US number)
 * - Database transaction management with rollback capability
 * - Integration with VAPI assistant linking
 * - Comprehensive error handling and logging
 */

// @ts-ignore - Deno URL import resolved at runtime in Supabase Edge
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import {
  initSentry,
  captureException,
  addBreadcrumb,
  setUser,
  setTag,
  startTransaction,
} from '../_shared/sentry.ts';

// Initialize Sentry at the top level
initSentry();

// Environment variables
const SUPABASE_URL = globalThis.Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = globalThis.Deno.env.get('SERVICE_ROLE_KEY');
const TWILIO_ACCOUNT_SID = globalThis.Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = globalThis.Deno.env.get('TWILIO_AUTH_TOKEN');
const VAPI_API_KEY = globalThis.Deno.env.get('VAPI_PRIVATE_KEY');
const VAPI_WEBHOOK_SECRET = globalThis.Deno.env.get('VAPI_WEBHOOK_SECRET');
const PUBLIC_SITE_URL =
  globalThis.Deno.env.get('NEXT_PUBLIC_SITE_URL') ||
  globalThis.Deno.env.get('NEXT_PUBLIC_APP_URL') ||
  'https://spoqen.com';

// Validate required environment variables
if (
  !SUPABASE_URL ||
  !SERVICE_ROLE_KEY ||
  !TWILIO_ACCOUNT_SID ||
  !TWILIO_AUTH_TOKEN ||
  !VAPI_API_KEY
) {
  const error = new Error('Missing required environment variables');
  captureException(error, {
    function: 'phone-number-provision',
    missing_vars: {
      SUPABASE_URL: !!SUPABASE_URL,
      SERVICE_ROLE_KEY: !!SERVICE_ROLE_KEY,
      TWILIO_ACCOUNT_SID: !!TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN: !!TWILIO_AUTH_TOKEN,
      VAPI_PRIVATE_KEY: !!VAPI_API_KEY,
    },
  });
  throw error;
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

interface PhoneProvisionPayload {
  user_id: string;
  tier_type: string;
  subscription_status: string;
  trigger_action: string;
  timestamp: string;
  subscription_id: string;
}

interface UserData {
  id: string;
  paddle_customer_id: string | null;
  email: string;
  city: string | null;
  state: string | null;
  subscription_id: string;
  subscription_tier_type: string;
  subscription_status: string;
  subscription_current: boolean;
  phone_id: string | null;
  phone_e164_number: string | null;
  phone_status: string | null;
  vapi_assistant_id: string | null;
  assistant_provisioning_status: string | null;
}

/**
 * Retrieve user data without relying on FK joins (four parallel queries)
 */
async function getUserData(userId: string): Promise<UserData | null> {
  const [profileRes, subRes, phoneRes, settingsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('current', true)
      .maybeSingle(),
    supabase
      .from('phone_numbers')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle(),
    supabase.from('user_settings').select('*').eq('id', userId).maybeSingle(),
  ]);

  if (profileRes.error) {
    console.error('Failed to fetch profile:', profileRes.error);
    return null;
  }

  const profile = profileRes.data;
  if (!profile) return null;

  const subscription = subRes.data || null;
  const phoneNumber = phoneRes.data || null;
  const userSettings = settingsRes.data || null;

  return {
    id: profile.id,
    paddle_customer_id: profile.paddle_customer_id,
    email: profile.email,
    city: profile.city,
    state: profile.state,
    subscription_id: subscription?.id,
    subscription_tier_type: subscription?.tier_type,
    subscription_status: subscription?.status,
    subscription_current: subscription?.current,
    phone_id: phoneNumber?.id,
    phone_e164_number: phoneNumber?.e164_number,
    phone_status: phoneNumber?.status,
    vapi_assistant_id: userSettings?.vapi_assistant_id,
    assistant_provisioning_status: userSettings?.assistant_provisioning_status,
  };
}

/**
 * Search for available US phone numbers using Twilio API
 */
async function searchAvailablePhoneNumbers(): Promise<any[]> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/AvailablePhoneNumbers/US/Local.json`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Twilio search failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.available_phone_numbers || [];
}

/**
 * Provision phone number with Twilio
 */
async function provisionPhoneNumber(phoneNumber: string): Promise<any> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json`;

  const body = new URLSearchParams({
    PhoneNumber: phoneNumber,
    SmsEnabled: 'true',
    VoiceEnabled: 'true',
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Twilio provision failed: ${response.status} ${errorText}`);
  }

  return await response.json();
}

/**
 * Store phone number in database using transaction
 */
async function storePhoneNumber(
  userId: string,
  phoneNumber: string,
  providerNumberId: string,
  tierType: string,
  provider: 'twilio' | 'vapi'
): Promise<{ success: boolean; error?: string }> {
  console.log('[PNP][store] begin', {
    userId,
    phoneNumber,
    providerNumberId,
    tierType,
  });
  const { data, error } = await supabase.rpc('provision_phone_transaction', {
    p_user_id: userId,
    p_phone_number: phoneNumber,
    p_provider_number_id: providerNumberId,
    p_tier_type: tierType,
    p_provider: provider,
  });

  if (error) {
    console.error('Database transaction failed:', error);
    return { success: false, error: error.message };
  }

  const ok = data && (data as any).success === true;
  console.log('[PNP][store] rpc result', { ok, data });
  if (!ok) {
    const errMsg =
      (data && (data as any).error) || 'Unknown DB error from RPC result';
    return { success: false, error: errMsg };
  }

  return { success: true };
}

/**
 * Link phone number to VAPI assistant
 */
async function linkPhoneToVAPIAssistant(
  userId: string,
  phoneNumber: string,
  name: string
): Promise<void> {
  // Call the vapi-number-update function
  const vapiUpdateUrl = `${SUPABASE_URL}/functions/v1/vapi-number-update`;

  const response = await fetch(vapiUpdateUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      user_id: userId,
      phone_number: phoneNumber,
      name,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.warn(`VAPI linking failed: ${response.status} ${errorText}`);
    // Don't throw - this is not critical for phone provisioning
  } else {
    console.log('[PNP][vapi] linked to assistant successfully');
  }
}

// VAPI helpers: assign existing free number and native number provisioning
async function assignExistingVapiNumber(
  assistantId: string | null,
  label: string
): Promise<{ number: string; providerId: string } | null> {
  if (!assistantId) return null;
  try {
    // List existing phone numbers
    const listRes = await fetch('https://api.vapi.ai/phone-number', {
      headers: { Authorization: `Bearer ${VAPI_API_KEY}` },
    });
    if (!listRes.ok) return null;
    const list = await listRes.json();
    if (!Array.isArray(list)) return null;
    // Find an unassigned VAPI-owned number (no assistant)
    const candidate = list.find(
      (p: any) => p?.provider === 'vapi' && !p?.assistantId
    );
    if (!candidate) return null;
    const vapiId = candidate?.id || candidate?._id;
    if (!vapiId) return null;
    const patchBody: any = {
      assistantId,
      name: (label || '').slice(0, 40),
      server: {
        url: `${PUBLIC_SITE_URL}/api/webhooks/vapi`,
        timeoutSeconds: 20,
        secret: VAPI_WEBHOOK_SECRET,
      },
    };
    const patchRes = await fetch(
      `https://api.vapi.ai/phone-number/${encodeURIComponent(vapiId)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patchBody),
      }
    );
    if (!patchRes.ok) {
      const text = await patchRes.text().catch(() => '');
      console.warn('[PNP][vapi-assign] patch failed', {
        status: patchRes.status,
        body: text,
      });
      return null;
    }
    const data = await patchRes.json().catch(() => ({}));
    const number =
      data?.number ||
      data?.phoneNumber ||
      data?.e164 ||
      candidate?.number ||
      null;
    const providerId = data?.id || data?._id || vapiId;
    if (!number || !providerId) return null;
    return { number, providerId };
  } catch (e) {
    console.warn('[PNP][vapi-assign] error', e);
    return null;
  }
}

async function provisionVapiNumber(
  assistantId: string | null,
  label: string
): Promise<{ number: string; providerId: string } | null> {
  if (!assistantId) return null;
  const payload: any = {
    provider: 'vapi',
    assistantId,
    name: (label || '').slice(0, 40),
    server: {
      url: `${PUBLIC_SITE_URL}/api/webhooks/vapi`,
      timeoutSeconds: 20,
      secret: VAPI_WEBHOOK_SECRET,
    },
  };
  try {
    const res = await fetch('https://api.vapi.ai/phone-number', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (res.status !== 201) {
      const text = await res.text().catch(() => '');
      console.warn('[PNP][vapi-first] create failed', {
        status: res.status,
        body: text,
      });
      return null;
    }
    const data = await res.json();
    const number = data?.number || data?.phoneNumber || data?.e164 || null;
    const providerId = data?.id || data?._id || null;
    if (!number || !providerId) return null;
    return { number, providerId };
  } catch (e) {
    console.warn('[PNP][vapi-first] create error', e);
    return null;
  }
}

/**
 * Main phone provisioning logic
 */
async function processPhoneProvisioning(
  payload: PhoneProvisionPayload
): Promise<{ success: boolean; message: string; error?: string }> {
  const rid =
    globalThis.crypto && 'randomUUID' in globalThis.crypto
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  console.log(`[PNP][${rid}] start process`, {
    payload_keys: Object.keys(payload),
  });
  const { user_id, tier_type, subscription_status } = payload;

  // Get user data with single JOIN query
  console.log(`[PNP][${rid}] fetching user data`);
  const userData = await getUserData(user_id);
  if (!userData) {
    console.log(`[PNP][${rid}] user not found`);
    return {
      success: false,
      message: 'User not found',
      error: 'USER_NOT_FOUND',
    };
  }
  console.log(`[PNP][${rid}] user data loaded`, {
    hasActivePhone: !!(
      userData.phone_e164_number && userData.phone_status === 'active'
    ),
    subTier: userData.subscription_tier_type,
    subCurrent: userData.subscription_current,
    subStatus: userData.subscription_status,
    assistStatus: userData.assistant_provisioning_status,
  });

  // Determine if phone provisioning is needed
  if (tier_type === 'free') {
    console.log(`[PNP][${rid}] skip: free tier`);
    return {
      success: true,
      message: 'Free tier - no phone provisioning needed',
    };
  }

  if (subscription_status !== 'active') {
    console.log(
      `[PNP][${rid}] skip: subscription not active (${subscription_status})`
    );
    return {
      success: true,
      message: 'Subscription not active - skipping provisioning',
    };
  }

  // Check for existing phone numbers to prevent duplicates
  if (userData.phone_e164_number && userData.phone_status === 'active') {
    console.log(
      `[PNP][${rid}] skip: already has active phone ${userData.phone_e164_number}`
    );
    return { success: true, message: 'Phone number already provisioned' };
  }

  // Validate subscription eligibility
  if (
    !userData.subscription_current ||
    userData.subscription_tier_type === 'free'
  ) {
    console.log(`[PNP][${rid}] skip: subscription not eligible`, {
      current: userData.subscription_current,
      tier: userData.subscription_tier_type,
    });
    // Treat as benign no-op, not an error
    return {
      success: true,
      message: 'Subscription not eligible for phone provisioning',
    };
  }

  let provisionedNumber: string | null = null;
  let providerNumberId: string | null = null;
  let providerType: 'twilio' | 'vapi' = 'twilio';

  try {
    // Try VAPI-native number first by assigning an existing unbound number
    console.log(`[PNP][${rid}] attempting VAPI assignment from pool`);
    const vapiRes = await assignExistingVapiNumber(
      userData.vapi_assistant_id || null,
      userData.email
    );
    if (vapiRes) {
      providerType = 'vapi';
      provisionedNumber = vapiRes.number;
      providerNumberId = vapiRes.providerId;
      console.log(`[PNP][${rid}] VAPI number assigned`, {
        provisionedNumber,
        providerNumberId,
      });
    } else {
      console.log(
        `[PNP][${rid}] No free VAPI numbers available; falling back to Twilio`
      );
    }

    // If VAPI path did not produce a number, buy on Twilio
    if (!provisionedNumber || !providerNumberId) {
      // Search for available phone numbers
      console.log(`[PNP][${rid}] searching available phone numbers`);
      const availableNumbers = await searchAvailablePhoneNumbers();
      console.log(`[PNP][${rid}] search results`, {
        count: availableNumbers.length,
      });

      if (availableNumbers.length === 0) {
        console.log(`[PNP][${rid}] no numbers available`);
        return {
          success: false,
          message: 'No phone numbers available',
          error: 'NO_NUMBERS_AVAILABLE',
        };
      }

      // Use the first available number
      const selectedNumber = availableNumbers[0];
      console.log(`[PNP][${rid}] selected number`, {
        number: selectedNumber.phone_number,
      });

      // Provision the phone number
      console.log(`[PNP][${rid}] provisioning with Twilio`);
      const provisionResult = await provisionPhoneNumber(
        selectedNumber.phone_number
      );
      provisionedNumber =
        provisionResult.phone_number || provisionResult.phoneNumber;
      providerNumberId = provisionResult.sid;
      providerType = 'twilio';
    }

    console.log(`[PNP][${rid}] provisioned`, {
      provisionedNumber,
      providerNumberId,
    });

    // Ensure Twilio response contained required fields
    if (!provisionedNumber || !providerNumberId) {
      throw new Error('Provisioning response missing phone number or SID');
    }

    // Store in database using transaction
    console.log(`[PNP][${rid}] storing phone in DB`);
    const storeResult = await storePhoneNumber(
      user_id,
      provisionedNumber as string,
      providerNumberId as string,
      tier_type,
      providerType
    );
    console.log(`[PNP][${rid}] store result`, storeResult);

    if (!storeResult.success) {
      // Keep Twilio number; mark provisioning failed state
      console.log(`[PNP][${rid}] DB storage failed (keeping Twilio number)`);
      await supabase
        .from('user_settings')
        .update({ assistant_provisioning_status: 'failed' })
        .eq('id', user_id);
      return {
        success: false,
        message: 'Database storage failed',
        error: storeResult.error,
      };
    }

    // Link to VAPI assistant only for Twilio numbers (VAPI-native already bound)
    if (providerType === 'twilio') {
      try {
        console.log(`[PNP][${rid}] linking Twilio number to VAPI`);
        await linkPhoneToVAPIAssistant(
          user_id,
          provisionedNumber as string,
          userData.email
        );
        console.log(`[PNP][${rid}] link to VAPI done`);
      } catch (error) {
        console.warn(`[PNP][${rid}] VAPI linking warn`, error);
        // Don't fail the entire operation for VAPI linking issues
      }
    }

    console.log(`[PNP][${rid}] marking provisioning completed`);
    // Mark provisioning completed
    await supabase
      .from('user_settings')
      .update({ assistant_provisioning_status: 'completed' })
      .eq('id', user_id);

    const successResult = {
      success: true,
      message: `Phone number ${provisionedNumber} provisioned successfully`,
    };
    console.log(`[PNP][${rid}] success`, successResult);
    return successResult;
  } catch (error) {
    console.error(`[PNP][${rid}] failed`, error);

    // Do not roll back Twilio number; mark provisioning failed
    await supabase
      .from('user_settings')
      .update({ assistant_provisioning_status: 'failed' })
      .eq('id', user_id);

    return {
      success: false,
      message: 'Phone provisioning failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Update phone provision log
 */
async function updateProvisionLog(
  userId: string,
  triggerAction: string,
  status: string,
  errorMessage?: string
): Promise<void> {
  await supabase
    .from('phone_provision_logs')
    .update({
      status,
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('trigger_action', triggerAction)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1);
}

globalThis.Deno.serve(async (req: Request) => {
  const transaction = startTransaction('phone-number-provision', 'trigger');

  try {
    addBreadcrumb('Request received', 'http', {
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
    });

    // Only allow POST requests
    if (req.method !== 'POST') {
      addBreadcrumb('Invalid method', 'validation', { method: req.method });
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      // Validate Authorization header
      const authHeader = req.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ error: 'Missing or invalid Authorization header' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      // Verify token matches service role key
      const token = authHeader.replace('Bearer ', '').trim();
      if (token !== SERVICE_ROLE_KEY) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Parse and validate request payload
      let payload: PhoneProvisionPayload;
      try {
        payload = await req.json();
        addBreadcrumb('Payload parsed', 'data', {
          payload_keys: Object.keys(payload),
        });
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Validate required fields
      const { user_id, tier_type, subscription_status, trigger_action } =
        payload;
      if (!user_id || !tier_type || !subscription_status || !trigger_action) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Validate user_id format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(user_id)) {
        return new Response(
          JSON.stringify({ error: 'Invalid user_id format' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      setUser(user_id);
      setTag('function', 'phone-number-provision');
      setTag('user_id', user_id);

      console.log(
        `Processing phone provisioning for user ${user_id}, tier: ${tier_type}, action: ${trigger_action}`
      );

      // Process phone provisioning
      const result = await processPhoneProvisioning(payload);
      console.log('[PNP] process result', result);

      // Update provision log
      await updateProvisionLog(
        user_id,
        trigger_action,
        result.success ? 'completed' : 'failed',
        result.error
      );

      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Unexpected error:', error);
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          function: 'phone-number-provision',
          operation: 'main_handler',
        }
      );
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : String(error),
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } finally {
    if (transaction) {
      transaction.finish();
    }
  }
});
