// Setup type definitions for built-in Supabase Runtime APIs
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

// @ts-ignore - Deno URL import resolved at runtime in Supabase Edge
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

// Environment
const SUPABASE_URL = globalThis.Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = globalThis.Deno.env.get('SERVICE_ROLE_KEY');
const TWILIO_ACCOUNT_SID = globalThis.Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = globalThis.Deno.env.get('TWILIO_AUTH_TOKEN');
const VAPI_API_KEY = globalThis.Deno.env.get('VAPI_PRIVATE_KEY');

if (
  !SUPABASE_URL ||
  !SERVICE_ROLE_KEY ||
  !TWILIO_ACCOUNT_SID ||
  !TWILIO_AUTH_TOKEN
) {
  throw new Error('Missing required environment variables');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

interface DeprovisionPayload {
  user_id: string;
  subscription_id?: string;
  trigger_action?: string; // e.g., 'subscription_canceled'
  timestamp?: string;
}

async function fetchActivePhoneForUser(userId: string) {
  const { data, error } = await supabase
    .from('phone_numbers')
    .select('id, provider, provider_number_id, e164_number, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();
  if (error) throw error;
  return data as {
    id: string;
    provider: string | null;
    provider_number_id: string | null;
    e164_number: string | null;
    status: string | null;
  } | null;
}

async function deleteTwilioNumber(providerNumberId: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers/${providerNumberId}.json`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
    },
  });
  if (res.status === 404) return true; // already gone
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Twilio delete failed: ${res.status} ${text}`);
  }
  return true;
}

async function removeNumberFromVapiByE164(e164Number: string) {
  // Best-effort removal. Treat 200/204/404 as success. Unknown API path tolerated.
  try {
    const url = `https://api.vapi.ai/phone-number?number=${encodeURIComponent(e164Number)}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${VAPI_API_KEY}`,
      },
    });
    if ([200, 204, 404].includes(res.status)) return true;
    return false;
  } catch {
    return false;
  }
}

async function markReleased(phoneId: string) {
  const { error } = await supabase
    .from('phone_numbers')
    .update({ status: 'released', released_at: new Date().toISOString() })
    .eq('id', phoneId)
    .eq('status', 'active');
  if (error) throw error;
}

globalThis.Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Auth check
    const auth = req.headers.get('Authorization');
    if (!auth || !auth.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const token = auth.replace('Bearer ', '').trim();
    if (token !== SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse payload
    let payload: DeprovisionPayload;
    try {
      payload = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { user_id } = payload || ({} as DeprovisionPayload);
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!user_id || !uuidRegex.test(user_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing user_id' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Find active phone
    const phone = await fetchActivePhoneForUser(user_id);
    if (!phone) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No active phone to deprovision',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Best-effort VAPI unlink/remove (non-fatal)
    if (phone.e164_number) {
      await removeNumberFromVapiByE164(phone.e164_number).catch(() => {});
    }

    // Twilio release (required if we have a provider SID)
    if (phone.provider_number_id) {
      await deleteTwilioNumber(phone.provider_number_id);
    }

    // Mark as released in DB
    await markReleased(phone.id);

    return new Response(
      JSON.stringify({ success: true, message: 'Deprovisioned successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
