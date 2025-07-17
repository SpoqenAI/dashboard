import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
  const envelope = await req.json();
  const msg = envelope.message;
  if (msg.type !== 'end-of-call-report')
    return new Response(null, { status: 200 });

  const assistantId = msg.assistant?.id ?? msg.call?.assistantId;
  if (!assistantId) {
    return new Response('Bad payload', { status: 400 });
  }

  /* 3. Invoke mail-sending function ------------------------------------ */
  const summary = msg.summary ?? msg.analysis?.summary ?? '';
  await supabase.functions.invoke('send-email-summary', {
    body: { assistantId, summary, phoneNumber: msg.customer?.number },
  });

  return new Response(null, { status: 200 });
});
