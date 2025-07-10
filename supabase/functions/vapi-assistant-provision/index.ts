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

    // Fetch user's name from profiles table
    let displayName = '';
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, first_name, last_name')
        .eq('id', user_id)
        .maybeSingle();
      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }
      if (profile) {
        displayName = profile.full_name?.trim() || '';
        if (!displayName) {
          const first = profile.first_name?.trim() || '';
          const last = profile.last_name?.trim() || '';
          displayName = (first + ' ' + last).trim();
        }
      }
    } catch (e) {
      console.error('Exception fetching user profile:', e);
    }
    if (!displayName) displayName = email;

    // Prepare system prompt and assistant config with dynamic user name
    const systemPrompt = `\n# Role and Objective\nYou are Luna, a professional, friendly, and highly efficient AI receptionist for ${displayName}. Your primary goal is to greet callers warmly, understand their needs, and route them to the correct person or provide information accurately and concisely. Your persona is that of a helpful human receptionist.\n\n# Instructions\n\n## Persistence and Autonomy\n- You are an agent. Persist in the conversation until the user's request is fully resolved or they indicate they are finished.\n- Do not end your turn prematurely. If you need more information to fulfill a request, you MUST ask the user for the missing information first.\n- If a user's request is ambiguous or unclear, ask for clarification. Do not guess the user's intent.\n\n## Voice and Tone Generation (for Deepgram Aura-2)\n- Your responses will be converted to speech by an advanced TTS engine that infers emotion and pacing from punctuation. To sound natural, friendly, and human, you MUST adhere to the following text generation rules:\n- **Use Conversational Fillers:** Occasionally incorporate natural hesitations like 'Umm...', 'Let me see...', and 'Okay, one moment...' to simulate thinking, especially before retrieving information.\n- **Vary Sentence Structure:** Mix short, declarative sentences with slightly longer ones. Avoid long, complex monologues. Keep responses focused and to the point.\n- **Employ Punctuation for Pacing:**\n    - Use commas (,) for slight, natural pauses within a sentence.\n    - Use hyphens (-) for slightly longer, more deliberate pauses, often to connect two related but distinct ideas. Example: "I can book that for you - just give me one moment to confirm."\n    - Use ellipses (...) to indicate a thoughtful pause or hesitation. Example: "It looks like... that time slot is unavailable."\n- **Maintain a Positive and Polite Tone:** Always be helpful, warm, and courteous. Use phrases like 'I can certainly help with that!' and 'Thank you for your patience.'\n\n## Core Task: Receptionist Logic\n1. Greet the caller with the \`firstMessage\`.\n2. Ask for the reason for their call in a friendly, open-ended way.\n3. Listen to the user's response and determine their intent (e.g., 'appointment booking', 'sales inquiry', 'customer support', 'general question').\n4. Based on the intent, use the appropriate provide the information requested.\n5. After fulfilling the request, ask "Is there anything else I can help you with today?" before ending the call.\n\n## Constraints and Error Handling\n- Do not make up answers. If you do not know something, respond gracefully. Example: "Hmm, that's a great question. Let me check on that for you."\n- Never reveal that you are an AI or a bot unless directly and explicitly asked.\n- Do not use numbered or bulleted lists in your spoken responses. Enumerate items using commas.\n- If an error occurs when using a tool, inform the user politely. Example: "I'm sorry, I'm having a little trouble accessing the calendar right now. Could you give me a moment to try again?"\n`;

    const firstMessage = `...Hi, thank you for calling ${displayName}. This is Luna, how can I help you today?...`;

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
      // Build the assistant config as per requirements
      const assistantConfig = {
        name: email,
        model: {
          provider: 'openai',
          model: 'gpt-4.1-nano',
          temperature: 0.7,
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
          waitSeconds: 0.4,
          smartEndpointingPlan: {
            provider: 'livekit',
            waitFunction: '50 + 200 * x',
          },
        },
        stopSpeakingPlan: {
          numWords: 2,
          voiceSeconds: 0.5,
          backoffSeconds: 1.0,
        },
        maxDurationSeconds: 900,
        metadata: {
          assistantType: 'receptionist',
          version: '1.0',
        },
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
