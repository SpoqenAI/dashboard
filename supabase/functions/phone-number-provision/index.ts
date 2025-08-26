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
const TWILIO_WEBHOOK_URL = globalThis.Deno.env.get('TWILIO_WEBHOOK_URL');
const VAPI_API_KEY = globalThis.Deno.env.get('VAPI_PRIVATE_KEY');

// Validate required environment variables
if (
  !SUPABASE_URL ||
  !SERVICE_ROLE_KEY ||
  !TWILIO_ACCOUNT_SID ||
  !TWILIO_AUTH_TOKEN ||
  !TWILIO_WEBHOOK_URL ||
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
      TWILIO_WEBHOOK_URL: !!TWILIO_WEBHOOK_URL,
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
 * Retrieve user data with single JOIN query
 */
async function getUserData(userId: string): Promise<UserData | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      `
      id,
      paddle_customer_id,
      email,
      city,
      state,
      subscriptions!inner (
        id,
        tier_type,
        status,
        current
      ),
      phone_numbers (
        id,
        e164_number,
        status
      ),
      user_settings (
        vapi_assistant_id,
        assistant_provisioning_status
      )
    `
    )
    .eq('id', userId)
    .eq('subscriptions.current', true)
    .single();

  if (error || !data) {
    console.error('Failed to fetch user data:', error);
    return null;
  }

  const subscription = Array.isArray(data.subscriptions)
    ? data.subscriptions[0]
    : data.subscriptions;
  const phoneNumber =
    Array.isArray(data.phone_numbers) && data.phone_numbers.length > 0
      ? data.phone_numbers[0]
      : null;
  const userSettings =
    Array.isArray(data.user_settings) && data.user_settings.length > 0
      ? data.user_settings[0]
      : null;

  return {
    id: data.id,
    paddle_customer_id: data.paddle_customer_id,
    email: data.email,
    city: data.city,
    state: data.state,
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
    VoiceUrl: TWILIO_WEBHOOK_URL,
    SmsUrl: TWILIO_WEBHOOK_URL,
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
  tierType: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('provision_phone_transaction', {
    p_user_id: userId,
    p_phone_number: phoneNumber,
    p_provider_number_id: providerNumberId,
    p_tier_type: tierType,
  });

  if (error) {
    console.error('Database transaction failed:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Link phone number to VAPI assistant
 */
async function linkPhoneToVAPIAssistant(
  userId: string,
  phoneNumber: string
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
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.warn(`VAPI linking failed: ${response.status} ${errorText}`);
    // Don't throw - this is not critical for phone provisioning
  }
}

/**
 * Release Twilio phone number (rollback)
 */
async function releaseTwilioNumber(providerNumberId: string): Promise<void> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers/${providerNumberId}.json`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
    },
  });

  if (!response.ok) {
    console.error(
      `Failed to release Twilio number ${providerNumberId}: ${response.status}`
    );
  }
}

/**
 * Main phone provisioning logic
 */
async function processPhoneProvisioning(
  payload: PhoneProvisionPayload
): Promise<{ success: boolean; message: string; error?: string }> {
  const { user_id, tier_type, subscription_status } = payload;

  // Get user data with single JOIN query
  const userData = await getUserData(user_id);
  if (!userData) {
    return {
      success: false,
      message: 'User not found',
      error: 'USER_NOT_FOUND',
    };
  }

  // Determine if phone provisioning is needed
  if (tier_type === 'free') {
    return {
      success: true,
      message: 'Free tier - no phone provisioning needed',
    };
  }

  if (subscription_status !== 'active') {
    return {
      success: true,
      message: 'Subscription not active - skipping provisioning',
    };
  }

  // Check for existing phone numbers to prevent duplicates
  if (userData.phone_e164_number && userData.phone_status === 'active') {
    return { success: true, message: 'Phone number already provisioned' };
  }

  // Validate subscription eligibility
  if (
    !userData.subscription_current ||
    userData.subscription_tier_type === 'free'
  ) {
    return {
      success: false,
      message: 'Subscription not eligible for phone provisioning',
    };
  }

  let provisionedNumber = null;
  let providerNumberId = null;

  try {
    // Search for available phone numbers
    console.log('Searching for available phone numbers...');
    const availableNumbers = await searchAvailablePhoneNumbers();

    if (availableNumbers.length === 0) {
      return {
        success: false,
        message: 'No phone numbers available',
        error: 'NO_NUMBERS_AVAILABLE',
      };
    }

    // Use the first available number
    const selectedNumber = availableNumbers[0];
    console.log(`Selected phone number: ${selectedNumber.phone_number}`);

    // Provision the phone number
    console.log('Provisioning phone number with Twilio...');
    const provisionResult = await provisionPhoneNumber(
      selectedNumber.phone_number
    );
    provisionedNumber =
      provisionResult.phone_number || provisionResult.phoneNumber;
    providerNumberId = provisionResult.sid;

    console.log(
      `Provisioned number: ${provisionedNumber}, SID: ${providerNumberId}`
    );

    // Store in database using transaction
    console.log('Storing phone number in database...');
    const storeResult = await storePhoneNumber(
      user_id,
      provisionedNumber,
      providerNumberId,
      tier_type
    );

    if (!storeResult.success) {
      // Rollback: Release the Twilio number
      console.log('Database storage failed, rolling back...');
      await releaseTwilioNumber(providerNumberId);
      return {
        success: false,
        message: 'Database storage failed',
        error: storeResult.error,
      };
    }

    // Link to VAPI assistant (non-blocking)
    try {
      console.log('Linking phone number to VAPI assistant...');
      await linkPhoneToVAPIAssistant(user_id, provisionedNumber);
    } catch (error) {
      console.warn('VAPI linking failed but continuing:', error);
      // Don't fail the entire operation for VAPI linking issues
    }

    return {
      success: true,
      message: `Phone number ${provisionedNumber} provisioned successfully`,
    };
  } catch (error) {
    console.error('Phone provisioning failed:', error);

    // Rollback: Release the Twilio number if it was provisioned
    if (providerNumberId) {
      console.log('Rolling back Twilio number...');
      await releaseTwilioNumber(providerNumberId);
    }

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
