// Supabase Edge Function: vapi-assistant-provision (Webhook version, x-webhook-secret only)
// Triggered by Supabase Database Webhook on INSERT to pending_vapi_provision
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const VAPI_API_KEY = Deno.env.get('VAPI_PRIVATE_KEY');
const VAPI_WEBHOOK_SECRET = Deno.env.get('VAPI_WEBHOOK_SECRET');
const APP_URL =
  Deno.env.get('NEXT_PUBLIC_APP_URL') ||
  Deno.env.get('NEXT_PUBLIC_APP_URL_DEV');
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET');

if (
  !SUPABASE_URL ||
  !SUPABASE_SERVICE_ROLE_KEY ||
  !VAPI_API_KEY ||
  !VAPI_WEBHOOK_SECRET ||
  !APP_URL
) {
  throw new Error('Missing required environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req: Request) => {
  // Check x-webhook-secret header
  const secret = req.headers.get('x-webhook-secret');
  if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
    return new Response(
      JSON.stringify({
        error: 'Unauthorized: missing or invalid webhook secret',
      }),
      { status: 401 }
    );
  }

  // Parse webhook payload
  let payload;
  try {
    payload = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
      status: 400,
    });
  }

  // Extract new row data (Supabase webhook format)
  const newRow = payload.record || payload.new || payload;
  const { id, user_id, email } = newRow || {};
  if (!id || !user_id || !email) {
    return new Response(
      JSON.stringify({ error: 'Missing required row data' }),
      { status: 400 }
    );
  }

  // Idempotency: check if user already has a vapi_assistant_id
  const { data: userSettings, error: userSettingsError } = await supabase
    .from('user_settings')
    .select('vapi_assistant_id')
    .eq('id', user_id)
    .single();
  if (userSettingsError) {
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch user_settings',
        details: userSettingsError.message,
      }),
      { status: 500 }
    );
  }
  if (userSettings && userSettings.vapi_assistant_id) {
    // Already provisioned, mark as processed
    await supabase
      .from('pending_vapi_provision')
      .update({ processed_at: new Date().toISOString() })
      .eq('id', id);
    return new Response(JSON.stringify({ message: 'Already provisioned' }), {
      status: 200,
    });
  }

  // Call VAPI API to create assistant
  let vapiAssistantId;
  try {
    const vapiRes = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
        'x-vapi-webhook-secret': VAPI_WEBHOOK_SECRET,
      },
      body: JSON.stringify({
        model: {
          provider: 'openai',
          model: 'gpt-4.1-nano',
          systemPrompt: 'You are a helpful AI assistant.',
        },
        voice: {
          provider: 'deepgram',
          voiceId: 'luna',
        },
        firstMessageMode: 'assistant-speaks-first',
        firstMessage: 'Hello! How can I help you today?',
        name: email,
      }),
    });
    if (!vapiRes.ok) {
      const err = await vapiRes.text();
      throw new Error(`VAPI API error: ${vapiRes.status} ${err}`);
    }
    const vapiData = await vapiRes.json();
    vapiAssistantId = vapiData.id;
    if (!vapiAssistantId) throw new Error('No assistant ID returned from VAPI');
  } catch (e) {
    await supabase
      .from('pending_vapi_provision')
      .update({ error: String(e) })
      .eq('id', id);
    return new Response(
      JSON.stringify({
        error: 'Failed to provision VAPI assistant',
        details: String(e),
      }),
      { status: 500 }
    );
  }

  // Update user_settings with vapi_assistant_id
  const { error: updateError } = await supabase
    .from('user_settings')
    .update({ vapi_assistant_id: vapiAssistantId })
    .eq('id', user_id);
  if (updateError) {
    await supabase
      .from('pending_vapi_provision')
      .update({ error: updateError.message })
      .eq('id', id);
    return new Response(
      JSON.stringify({
        error: 'Failed to update user_settings',
        details: updateError.message,
      }),
      { status: 500 }
    );
  }

  // Mark as processed
  await supabase
    .from('pending_vapi_provision')
    .update({ processed_at: new Date().toISOString(), error: null })
    .eq('id', id);

  return new Response(
    JSON.stringify({
      message: 'VAPI assistant provisioned',
      vapi_assistant_id: vapiAssistantId,
    }),
    { status: 200 }
  );
});
