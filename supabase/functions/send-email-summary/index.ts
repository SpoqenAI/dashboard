/** Edge function: send-email-summary */
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import React from 'https://esm.sh/react@18';
import { renderToStaticMarkup } from 'https://esm.sh/react-dom@18/server';
import CallSummaryEmail from '../_shared/templates/call-summary.tsx';

const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
for (const envVar of requiredEnvVars) {
  if (!Deno.env.get(envVar)) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface Payload {
  assistantId: string;
  summary: string;
  phoneNumber?: string;
}

serve(async req => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { Allow: 'POST' },
    });
  }
  const { assistantId, summary, phoneNumber } = (await req.json()) as Payload;

  /* a. Resolve user & email preferences -------------------------------- */
  const { data: userSettings } = await supabase
    .from('user_settings')
    .select('id,email_notifications')
    .eq('vapi_assistant_id', assistantId)
    .maybeSingle();

  if (!userSettings || userSettings.email_notifications === false) {
    return new Response(JSON.stringify({ skipped: true }), { status: 200 });
  }

  const userId = userSettings.id;
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single();

  if (!profile?.email) {
    return new Response(JSON.stringify({ skipped: true }), { status: 200 });
  }

  /* b. Render React template to HTML ------------------------------------ */
  const baseUrl = Deno.env.get('BASE_URL') ?? 'https://www.spoqen.com';
  const bucketUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/public-assets`;
  const html = renderToStaticMarkup(
    React.createElement(CallSummaryEmail, {
      summary,
      phoneNumber,
      logoUrl: `${bucketUrl}/Spoqen.png`,
      fullLogoUrl: `${bucketUrl}/Spoqen-full.png`,
      dashboardUrl: `${baseUrl}/dashboard`,
    })
  );

  /* c. Send email via SendGrid REST API --------------------------------- */
  const apiKey = Deno.env.get('SENDGRID_API_KEY')!;
  const from = Deno.env.get('SENDGRID_FROM_EMAIL')!;

  await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: profile.email }] }],
      from: { email: from },
      subject: '[Spoqen] Call Summary',
      content: [
        { type: 'text/plain', value: summary },
        { type: 'text/html', value: html },
      ],
    }),
  });

  return new Response(JSON.stringify({ sent: true }), { status: 200 });
});
