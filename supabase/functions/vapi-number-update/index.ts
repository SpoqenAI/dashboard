/**
 * Supabase Edge Function: vapi-number-update
 *
 * This function links phone numbers to VAPI assistants by updating the assistant
 * configuration with the provisioned phone number.
 *
 * Key features:
 * - Retrieves user's VAPI assistant ID from user_settings
 * - Updates VAPI assistant with phone number association
 * - Configures webhook URLs and assistant settings
 * - Implements retry logic with exponential backoff
 */ import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
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
const VAPI_API_KEY = globalThis.Deno.env.get('VAPI_PRIVATE_KEY');
const VAPI_WEBHOOK_SECRET = globalThis.Deno.env.get('VAPI_WEBHOOK_SECRET');
const TWILIO_ACCOUNT_SID = globalThis.Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = globalThis.Deno.env.get('TWILIO_AUTH_TOKEN');
// Validate required environment variables
if (
  !SUPABASE_URL ||
  !SERVICE_ROLE_KEY ||
  !VAPI_API_KEY ||
  !VAPI_WEBHOOK_SECRET ||
  !TWILIO_ACCOUNT_SID ||
  !TWILIO_AUTH_TOKEN
) {
  const error = new Error('Missing required environment variables');
  captureException(error, {
    function: 'vapi-number-update',
    missing_vars: {
      SUPABASE_URL: !!SUPABASE_URL,
      SERVICE_ROLE_KEY: !!SERVICE_ROLE_KEY,
      VAPI_PRIVATE_KEY: !!VAPI_API_KEY,
      VAPI_WEBHOOK_SECRET: !!VAPI_WEBHOOK_SECRET,
      TWILIO_ACCOUNT_SID: !!TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN: !!TWILIO_AUTH_TOKEN,
    },
  });
  throw error;
}
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
/**
 * Get user's VAPI assistant ID from database
 */ async function getUserVAPIAssistantId(userId) {
  const { data, error } = await supabase
    .from('user_settings')
    .select('vapi_assistant_id')
    .eq('id', userId)
    .single();
  if (error || !data?.vapi_assistant_id) {
    console.error('Failed to get VAPI assistant ID:', error);
    return null;
  }
  return data.vapi_assistant_id;
}
/**
 * Import Twilio number into VAPI and link to assistant
 */ async function importPhoneNumberIntoVapi(
  assistantId,
  phoneNumber,
  name,
  userId
) {
  const webhookUrl = `${globalThis.Deno.env.get('NEXT_PUBLIC_SITE_URL') || globalThis.Deno.env.get('NEXT_PUBLIC_APP_URL') || 'https://spoqen.com'}/api/webhooks/vapi`;
  const payload = {
    provider: 'twilio',
    number: phoneNumber,
    twilioAccountSid: TWILIO_ACCOUNT_SID,
    twilioAuthToken: TWILIO_AUTH_TOKEN,
    assistantId,
    name,
    server: {
      url: webhookUrl,
      timeoutSeconds: 20,
      secret: VAPI_WEBHOOK_SECRET,
    },
  } as any;
  try {
    const response = await fetch('https://api.vapi.ai/phone-number', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    // 201 Created or 409 Conflict (already exists) are both considered success
    if (response.status === 201 || response.status === 409) {
      let vapiId: string | null = null;
      if (response.status === 201) {
        try {
          const data = await response.json();
          vapiId = (data && (data.id || data._id)) || null;
        } catch {}
      }
      // If conflict or missing id, look it up by number via list endpoint
      if (!vapiId) {
        try {
          const lookup = await fetch('https://api.vapi.ai/phone-number', {
            headers: { Authorization: `Bearer ${VAPI_API_KEY}` },
          });
          if (lookup.ok) {
            const list = await lookup.json();
            if (Array.isArray(list)) {
              const rec = list.find(
                (p: any) => p?.number === phoneNumber || p?.e164 === phoneNumber
              );
              vapiId = (rec && (rec.id || rec._id)) || null;
            }
          }
        } catch {}
      }
      if (vapiId) {
        await supabase
          .from('phone_numbers')
          .update({ vapi_number_id: vapiId })
          .eq('user_id', userId)
          .eq('status', 'active');
      }
      return {
        success: true,
        vapi_number_id: vapiId,
      };
    }
    const errorText = await response.text();
    console.error(`VAPI import error: ${response.status} ${errorText}`);
    return {
      success: false,
      error: `VAPI import error: ${response.status} ${errorText}`,
    };
  } catch (error) {
    console.error('Failed to import phone number into VAPI:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
/**
 * Retry function with exponential backoff
 */ async function retryWithBackoff(
  operation,
  maxRetries = 3,
  baseDelay = 1000
) {
  let lastError = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === maxRetries - 1) {
        throw lastError;
      }
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(
        `Retry attempt ${attempt + 1} failed, retrying in ${delay}ms:`,
        lastError.message
      );
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}
/**
 * Link phone number to VAPI assistant with retry logic
 */ async function linkPhoneToVAPIAssistant(userId, phoneNumber, label) {
  try {
    // Get user's VAPI assistant ID
    const assistantId = await getUserVAPIAssistantId(userId);
    if (!assistantId) {
      return {
        success: false,
        message: 'No VAPI assistant found for user',
        error: 'NO_ASSISTANT_ID',
      };
    }
    console.log(`Linking phone ${phoneNumber} to assistant ${assistantId}`);
    // Import phone number into VAPI with retry logic
    const result = await retryWithBackoff(
      () => importPhoneNumberIntoVapi(assistantId, phoneNumber, label, userId),
      3,
      1000 // base delay in ms
    );
    if (!result.success) {
      return {
        success: false,
        message: 'Failed to update VAPI assistant',
        error: result.error,
      };
    }
    return {
      success: true,
      message: `Phone number ${phoneNumber} linked to VAPI assistant ${assistantId}`,
    };
  } catch (error) {
    console.error('VAPI linking failed:', error);
    return {
      success: false,
      message: 'VAPI linking failed with error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
globalThis.Deno.serve(async req => {
  const transaction = startTransaction('vapi-number-update', 'phone-linking');
  try {
    addBreadcrumb('Request received', 'http', {
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
    });
    // Only allow POST requests
    if (req.method !== 'POST') {
      addBreadcrumb('Invalid method', 'validation', {
        method: req.method,
      });
      return new Response(
        JSON.stringify({
          error: 'Method not allowed',
        }),
        {
          status: 405,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
    try {
      // Validate Authorization header
      const authHeader = req.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({
            error: 'Missing or invalid Authorization header',
          }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }
      // Parse and validate request payload
      let payload;
      try {
        payload = await req.json();
        addBreadcrumb('Payload parsed', 'data', {
          payload_keys: Object.keys(payload),
        });
      } catch {
        return new Response(
          JSON.stringify({
            error: 'Invalid JSON payload',
          }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }
      // Validate required fields
      const { user_id, phone_number, label } = payload;
      if (!user_id || !phone_number) {
        return new Response(
          JSON.stringify({
            error: 'Missing required fields: user_id, phone_number',
          }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }
      // Validate user_id format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(user_id)) {
        return new Response(
          JSON.stringify({
            error: 'Invalid user_id format',
          }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }
      setUser(user_id);
      setTag('function', 'vapi-number-update');
      setTag('user_id', user_id);
      console.log(
        `Processing VAPI number update for user ${user_id}, phone: ${phone_number}`
      );
      // Link phone to VAPI assistant
      const result = await linkPhoneToVAPIAssistant(
        user_id,
        phone_number,
        label
      );
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Unexpected error:', error);
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          function: 'vapi-number-update',
          operation: 'main_handler',
        }
      );
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : String(error),
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  } finally {
    if (transaction) {
      transaction.finish();
    }
  }
});
