// Supabase Edge Function: vapi-assistant-provision (Webhook version, x-webhook-secret only)
// Triggered by Supabase Database Webhook on INSERT to pending_vapi_provision
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const VAPI_API_KEY = Deno.env.get('VAPI_PRIVATE_KEY');
const VAPI_WEBHOOK_SECRET = Deno.env.get('VAPI_WEBHOOK_SECRET');
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET');

if (
  !SUPABASE_URL ||
  !SUPABASE_SERVICE_ROLE_KEY ||
  !VAPI_API_KEY ||
  !VAPI_WEBHOOK_SECRET ||
  !WEBHOOK_SECRET
) {
  throw new Error('Missing required environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req: Request) => {
  try {
    // Log incoming request headers and method
    console.log('Incoming request:', {
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
    });

    // Check x-webhook-secret header
    const secret = req.headers.get('x-webhook-secret');
    if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
      console.error('Unauthorized: missing or invalid webhook secret', {
        secret,
      });
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
      console.log('Parsed payload:', payload);
    } catch (e) {
      console.error('Invalid JSON payload', e);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload', details: String(e) }),
        {
          status: 400,
        }
      );
    }

    // Extract new row data (Supabase webhook format)
    const newRow = payload.record || payload.new || payload;
    const { id, user_id, email } = newRow || {};
    console.log('Extracted row:', { id, user_id, email });
    if (!id || !user_id || !email) {
      console.error('Missing required row data', { id, user_id, email });
      return new Response(
        JSON.stringify({
          error: 'Missing required row data',
          details: { id, user_id, email },
        }),
        { status: 400 }
      );
    }

    // Idempotency: check if user already has a vapi_assistant_id
    const { data: userSettings, error: userSettingsError } = await supabase
      .from('user_settings')
      .select('vapi_assistant_id')
      .eq('id', user_id)
      .maybeSingle();
    if (userSettingsError) {
      console.error('userSettingsError:', userSettingsError, { user_id });
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch user_settings',
          details: userSettingsError.message,
        }),
        { status: 500 }
      );
    }
    if (userSettings?.vapi_assistant_id) {
      // Already provisioned, mark as processed
      try {
        await supabase
          .from('pending_vapi_provision')
          .update({ processed_at: new Date().toISOString() })
          .eq('id', id);
      } catch (e) {
        console.error(
          'Error updating processed_at for already provisioned user:',
          e,
          { id }
        );
      }
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
        console.error('VAPI API error:', vapiRes.status, err);
        throw new Error(`VAPI API error: ${vapiRes.status} ${err}`);
      }
      const vapiData = await vapiRes.json();
      vapiAssistantId = vapiData.id;
      if (!vapiAssistantId)
        throw new Error('No assistant ID returned from VAPI');
      console.log('VAPI assistant created:', vapiAssistantId);
    } catch (e) {
      console.error('Failed to provision VAPI assistant:', e, {
        id,
        user_id,
        email,
      });
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
      console.error('Failed to update user_settings:', updateError, {
        user_id,
        vapiAssistantId,
      });
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
    try {
      await supabase
        .from('pending_vapi_provision')
        .update({ processed_at: new Date().toISOString(), error: null })
        .eq('id', id);
      console.log('Provisioning complete for row:', id);
    } catch (e) {
      console.error(
        'Error updating processed_at after successful provisioning:',
        e,
        { id }
      );
    }

    return new Response(
      JSON.stringify({
        message: 'VAPI assistant provisioned',
        vapi_assistant_id: vapiAssistantId,
      }),
      { status: 200 }
    );
  } catch (e) {
    // Catch any unexpected errors
    console.error('Unexpected error in vapi-assistant-provision function:', e);
    return new Response(
      JSON.stringify({ error: 'Unexpected error', details: String(e) }),
      { status: 500 }
    );
  }
});
