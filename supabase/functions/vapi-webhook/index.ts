import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
for (const name of requiredEnv) {
  if (!Deno.env.get(name)) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async req => {
  /* 1. Secret header check --------------------------------------------- */
  if (
    req.headers.get('x-vapi-secret') !== Deno.env.get('VAPI_WEBHOOK_SECRET')
  ) {
    return new Response('Unauthorized', { status: 401 });
  }

  /* 2. Parse message ---------------------------------------------------- */
  let envelope: any;
  try {
    envelope = await req.json();
  } catch (err) {
    console.error('Invalid JSON payload', err);
    return new Response('Invalid JSON', { status: 400 });
  }
  const msg = envelope.message;
  if (msg.type !== 'end-of-call-report')
    return new Response(null, { status: 200 });

  const assistantId = msg.assistant?.id ?? msg.call?.assistantId;
  if (!assistantId) {
    return new Response('Bad payload', { status: 400 });
  }

  /* 3. Invoke mail-sending function ------------------------------------ */
  const summary = msg.summary ?? msg.analysis?.summary ?? '';
  try {
    const { error: invokeErr } = await supabase.functions.invoke(
      'send-email-summary',
      {
        body: { assistantId, summary, phoneNumber: msg.customer?.number },
      }
    );

    if (invokeErr) {
      console.error('send-email-summary invocation failed', invokeErr);
      // Decide whether to surface error or still return 200 to acknowledge webhook
      return new Response('Email function failed', { status: 502 });
    }
  } catch (err) {
    console.error('Error invoking send-email-summary', err);
    return new Response('Email function error', { status: 500 });
  }

  return new Response(null, { status: 200 });
});
