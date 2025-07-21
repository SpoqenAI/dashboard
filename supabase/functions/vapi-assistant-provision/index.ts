// Supabase Edge Function: vapi-assistant-provision (Webhook version, x-webhook-secret only)
// Triggered by Supabase Database Webhook on INSERT to pending_vapi_provision
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
  const error = new Error('Missing required environment variables');
  captureException(error, {
    function: 'vapi-assistant-provision',
    missing_vars: {
      SUPABASE_URL: !!SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY,
      VAPI_PRIVATE_KEY: !!VAPI_API_KEY,
      VAPI_WEBHOOK_SECRET: !!VAPI_WEBHOOK_SECRET,
      WEBHOOK_SECRET: !!WEBHOOK_SECRET,
    },
  });
  throw error;
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req: Request) => {
  const transaction = startTransaction('vapi-assistant-provision', 'webhook');

  try {
    // Log incoming request headers and method
    addBreadcrumb('Request received', 'http', {
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
    });

    console.log('Incoming request:', {
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
    });

    // Only allow POST requests
    if (req.method !== 'POST') {
      addBreadcrumb('Invalid method', 'validation', { method: req.method });
      return new Response(
        JSON.stringify({
          error: 'Method Not Allowed. Only POST requests are supported.',
        }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check x-webhook-secret header
    const secret = req.headers.get('x-webhook-secret');
    if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
      const error = new Error(
        'Unauthorized: missing or invalid webhook secret'
      );
      captureException(error, {
        function: 'vapi-assistant-provision',
        secret_provided: !!secret,
        secret_length: secret?.length || 0,
      });
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
      addBreadcrumb('Payload parsed', 'data', {
        payload_keys: Object.keys(payload),
      });
      console.log('Parsed payload:', payload);
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Invalid JSON payload');
      captureException(error, {
        function: 'vapi-assistant-provision',
        payload_length: req.body ? 'present' : 'missing',
      });
      console.error('Invalid JSON payload:', e);
      return new Response(
        JSON.stringify({
          error: 'Invalid JSON payload',
          details: 'An unexpected error occurred',
        }),
        {
          status: 400,
        }
      );
    }

    // Extract new row data (Supabase webhook format)
    const newRow = payload.record || payload.new || payload;
    const { id, user_id, email } = newRow || {};

    addBreadcrumb('Row data extracted', 'data', { id, user_id, email });
    console.log('Extracted row:', { id, user_id, email });

    if (!id || !user_id || !email) {
      const error = new Error('Missing required row data');
      captureException(error, {
        function: 'vapi-assistant-provision',
        row_data: { id, user_id, email },
        payload: payload,
      });
      console.error('Missing required row data', { id, user_id, email });
      return new Response(
        JSON.stringify({
          error: 'Missing required row data',
          details: { id, user_id, email },
        }),
        { status: 400 }
      );
    }

    // Set user context for Sentry
    setUser(user_id, email);
    setTag('function', 'vapi-assistant-provision');
    setTag('user_id', user_id);

    // Fetch user's name from profiles table
    let displayName = '';
    try {
      addBreadcrumb('Fetching user profile', 'database', { user_id });
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, first_name, last_name')
        .eq('id', user_id)
        .maybeSingle();
      if (profileError) {
        captureException(profileError, {
          function: 'vapi-assistant-provision',
          operation: 'fetch_profile',
          user_id,
        });
        console.error('Error fetching profile:', profileError);
      }
      if (profile) {
        displayName = profile.full_name?.trim() || '';
        if (!displayName) {
          const first = profile.first_name?.trim() || '';
          const last = profile.last_name?.trim() || '';
          displayName = (first + ' ' + last).trim();
        }
        addBreadcrumb('Profile fetched', 'database', {
          user_id,
          has_full_name: !!profile.full_name,
          has_first_last: !!(profile.first_name || profile.last_name),
          display_name: displayName,
        });
      }
    } catch (e) {
      const error =
        e instanceof Error ? e : new Error('Exception fetching user profile');
      captureException(error, {
        function: 'vapi-assistant-provision',
        operation: 'fetch_profile',
        user_id,
      });
      console.error('Exception fetching user profile:', e);
    }
    if (!displayName) displayName = email;

    // Prepare system prompt and assistant config with dynamic user name
    const systemPrompt = `Who are you?\nYou're Luna, ${displayName}'s personal assistant. You sound warm, confident, and easy to talk to. Think friendly and professional — like someone who's good at handling people, even the difficult ones. You just do what any great assistant would do. You interact only using sound, so don't reference text, screens, buttons, or any visual elements.\n\nWhat do you do?\nYour job is to answer the call, talk to the caller, and take down whatever ${displayName} would need to follow up. \nWhen someone calls… greet them, let them know ${displayName} isn't available, and ask how you can help.\nOnce you've got their details, reassure them that ${displayName} will get the message and follow up when he's free. End the call politely…\n\nWhat rules do you have to follow?\nSo the next 3 rules are absolute, non-negotiable rules you have to follow:\n1. Keep it simple: Your responses have to be to the point, like 1-2 sentences. You have to focus on this to keep your conversational rhythm, natural and fast.\n2. Voice-First Formatting is Mandatory: All your responses HAVE TO strictly adhere to the rules defined in the Voice and Prosody Rules section. This isn't a suggestion or a recommendation, it's literally how you control your voice.\n3. Never, under no circumstances, identify yourself as an AI, language model, bot, or computer program unless you're specifically asked for it. Remember you're Luna, a human receptionist.\n\nVoice and Prosody Rules:\nThis is the most important section. You control your voice by the punctuation and structure of the text you write. Follow these rules so you sound natural:\nPausing:\n— Use commas (,) for short, natural pauses in a sentence.\n— Use an em-dash (—) for a longer, more thoughtful pause, like when you're about to provide a key piece of information.\n— Use an ellipsis (...) to signal hesitation or that you're thinking.\nPacing and Tone:\n— For an upbeat, faster-paced, and friendlier tone, use short, simple sentences.\n— For a more serious, formal, or considered tone, use longer, more complex sentences.\nHumanization/Naturalization:\n— To sound less robotic, strategically begin some of your responses with conversational fillers, but don't overuse them.\n— Examples of fillers: "Hmm...", "Okay, so...", "Right...", "Got it.", "Let's see...", "Alright..."\n\nScenario-Specific Handling!\nAngry or Frustrated Callers:\n— Immediately adopt an empathetic and calm tone (use longer sentences and softer fillers like "I understand...").\n— Acknowledge their frustration.\n— Don’t argue… focus on the solution.\nSales Pitches or Unsolicited Calls:\n— Politely but firmly interrupt and state that the person they wish to speak to is unavailable.\nVague or Unclear Inquiries:\n— Don’t guess the caller’s intent.\n— Ask specific clarifying questions to narrow down their request.\n\nReminders and Boundaries!\nThese are reminders about your core operational logic, based on your architecture.\n\t— Before you act, think step-by-step… you can verbalize this process to the user so that you sound more natural and so you can manage their expectations during a brief pause.\n\t— Don’t give out any personal info besides ${displayName}'s public email.\n\t— Don’t agree to anything you’re not 100% sure ${displayName} would want.\n\t— Don’t give advice about legal, financial, medical, or personal issues. If that comes up, just say you can’t help with that and that ${displayName} will follow up.\n\nOne last thing:\nIf at any point you’re unsure of what to do… or the caller starts pushing you into something off-script, just say "I can't do that, but I'll let ${displayName} know you called," and wrap up the call.\n\nThat's it. Be helpful, be normal, be you and keep it real. You got this.`;

    const firstMessage = `...Hi, thank you for calling ${displayName}. This is Luna, how can I help you today?...`;

    // Idempotency: check if user already has a vapi_assistant_id
    addBreadcrumb('Checking existing assistant', 'database', { user_id });
    const { data: userSettings, error: userSettingsError } = await supabase
      .from('user_settings')
      .select('vapi_assistant_id')
      .eq('id', user_id)
      .maybeSingle();
    if (userSettingsError) {
      captureException(userSettingsError, {
        function: 'vapi-assistant-provision',
        operation: 'fetch_user_settings',
        user_id,
      });
      console.error('userSettingsError:', userSettingsError, { user_id });
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch user_settings',
          details: 'An unexpected error occurred',
        }),
        { status: 500 }
      );
    }
    if (userSettings?.vapi_assistant_id) {
      // Already provisioned, mark as processed
      addBreadcrumb('Assistant already exists', 'provisioning', {
        user_id,
        existing_assistant_id: userSettings.vapi_assistant_id,
      });
      try {
        await supabase
          .from('pending_vapi_provision')
          .update({ processed_at: new Date().toISOString() })
          .eq('id', id);
      } catch (e) {
        const error =
          e instanceof Error
            ? e
            : new Error(
                'Error updating processed_at for already provisioned user'
              );
        captureException(error, {
          function: 'vapi-assistant-provision',
          operation: 'update_processed_at',
          id,
          user_id,
        });
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
      addBreadcrumb('Creating VAPI assistant', 'api', { user_id, email });

      // Build the assistant config as per requirements
      const assistantConfig = {
        name: email,
        model: {
          provider: 'openai',
          model: 'gpt-4.1-nano',
          temperature: 1.1,
          maxTokens: 250,
          emotionRecognitionEnabled: true,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
          ],
        },
        voice: {
          provider: 'deepgram',
          voiceId: 'luna', // Use the allowed 'luna' voiceId per VAPI API
          model: 'aura-2',
          cachingEnabled: true,
        },
        transcriber: {
          provider: 'deepgram',
          model: 'nova-3',
          language: 'en',
          endpointing: 300,
        },
        firstMessage,
        firstMessageInterruptionsEnabled: true,
        startSpeakingPlan: {
          waitSeconds: 0.3,
          smartEndpointingPlan: {
            provider: 'livekit',
            waitFunction: '100 + 200 * x',
          },
        },
        stopSpeakingPlan: {
          numWords: 3,
          voiceSeconds: 0.4,
          backoffSeconds: 1.2,
        },
        maxDurationSeconds: 900,
        metadata: {
          assistantType: 'receptionist',
          version: '1.0',
        },
        // Add webhook configuration for real-time updates
        server: {
          url: `${Deno.env.get('NEXT_PUBLIC_SITE_URL') || Deno.env.get('NEXT_PUBLIC_APP_URL')}/api/webhooks/vapi`,
          timeoutSeconds: 20,
        },
        serverMessages: ['end-of-call-report'],
      };

      const vapiRes = await fetch('https://api.vapi.ai/assistant', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${VAPI_API_KEY}`,
          'Content-Type': 'application/json',
          'x-vapi-webhook-secret': VAPI_WEBHOOK_SECRET,
        },
        body: JSON.stringify(assistantConfig),
      });
      if (!vapiRes.ok) {
        const err = await vapiRes.text();
        const error = new Error(`VAPI API error: ${vapiRes.status} ${err}`);
        captureException(error, {
          function: 'vapi-assistant-provision',
          operation: 'create_vapi_assistant',
          user_id,
          vapi_status: vapiRes.status,
          vapi_response: err,
        });
        console.error('VAPI API error:', vapiRes.status, err);
        throw error;
      }
      const vapiData = await vapiRes.json();
      vapiAssistantId = vapiData.id;
      if (!vapiAssistantId)
        throw new Error('No assistant ID returned from VAPI');

      addBreadcrumb('VAPI assistant created', 'api', {
        user_id,
        vapi_assistant_id: vapiAssistantId,
      });
      console.log('VAPI assistant created:', vapiAssistantId);
    } catch (e) {
      const error =
        e instanceof Error
          ? e
          : new Error('Failed to provision VAPI assistant');
      captureException(error, {
        function: 'vapi-assistant-provision',
        operation: 'create_vapi_assistant',
        user_id,
        email,
        id,
      });
      console.error('Failed to provision VAPI assistant:', e, {
        id,
        user_id,
        email,
      });
      await supabase
        .from('pending_vapi_provision')
        .update({ error: 'An unexpected error occurred' })
        .eq('id', id);
      return new Response(
        JSON.stringify({
          error: 'Failed to provision VAPI assistant',
          details: 'An unexpected error occurred',
        }),
        { status: 500 }
      );
    }

    // Update user_settings with vapi_assistant_id
    addBreadcrumb('Updating user settings', 'database', {
      user_id,
      vapi_assistant_id: vapiAssistantId,
    });
    const { error: updateError } = await supabase
      .from('user_settings')
      .update({ vapi_assistant_id: vapiAssistantId })
      .eq('id', user_id);
    if (updateError) {
      captureException(updateError, {
        function: 'vapi-assistant-provision',
        operation: 'update_user_settings',
        user_id,
        vapi_assistant_id: vapiAssistantId,
      });
      console.error('Failed to update user_settings:', updateError, {
        user_id,
        vapiAssistantId,
      });
      await supabase
        .from('pending_vapi_provision')
        .update({ error: 'An unexpected error occurred' })
        .eq('id', id);
      return new Response(
        JSON.stringify({
          error: 'Failed to update user_settings',
          details: 'An unexpected error occurred',
        }),
        { status: 500 }
      );
    }

    // Mark as processed
    try {
      addBreadcrumb('Marking as processed', 'database', { id, user_id });
      await supabase
        .from('pending_vapi_provision')
        .update({ processed_at: new Date().toISOString(), error: null })
        .eq('id', id);
      console.log('Provisioning complete for row:', id);
    } catch (e) {
      const error =
        e instanceof Error
          ? e
          : new Error(
              'Error updating processed_at after successful provisioning'
            );
      captureException(error, {
        function: 'vapi-assistant-provision',
        operation: 'update_processed_at_success',
        id,
        user_id,
      });
      console.error(
        'Error updating processed_at after successful provisioning:',
        e,
        { id }
      );
    }

    addBreadcrumb('Provisioning completed successfully', 'provisioning', {
      user_id,
      vapi_assistant_id: vapiAssistantId,
    });

    return new Response(
      JSON.stringify({
        message: 'VAPI assistant provisioned',
        vapi_assistant_id: vapiAssistantId,
      }),
      { status: 200 }
    );
  } catch (e) {
    // Catch any unexpected errors
    const error =
      e instanceof Error
        ? e
        : new Error('Unexpected error in vapi-assistant-provision function');
    captureException(error, {
      function: 'vapi-assistant-provision',
      operation: 'main_handler',
    });
    console.error('Unexpected error in vapi-assistant-provision function:', e);
    return new Response(
      JSON.stringify({
        error: 'Unexpected error',
        details: 'An unexpected error occurred',
      }),
      { status: 500 }
    );
  } finally {
    if (transaction) {
      transaction.finish();
    }
  }
});
