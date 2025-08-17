import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import React from 'https://esm.sh/react@18.3.1';
import { renderToStaticMarkup } from 'https://esm.sh/react-dom@18.3.1/server';
import CallSummaryEmail from '../_shared/templates/call-summary.tsx';
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
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'BREVO_API_KEY',
  'FROM_EMAIL',
];
for (const envVar of requiredEnvVars) {
  if (!Deno.env.get(envVar)) {
    const error = new Error(`Missing required environment variable: ${envVar}`);
    captureException(error, {
      function: 'send-email-summary',
      missing_env_var: envVar,
    });
    throw error;
  }
}
const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
);
serve(async req => {
  const transaction = startTransaction('send-email-summary', 'email');
  try {
    if (req.method !== 'POST') {
      addBreadcrumb('Invalid method', 'validation', {
        method: req.method,
      });
      return new Response('Method Not Allowed', {
        status: 405,
        headers: {
          Allow: 'POST',
        },
      });
    }
    addBreadcrumb('Request received', 'http', {
      method: req.method,
    });
    const payload = await req.json();
    const { assistantId, summary, phoneNumber, callerName, callAnalysis } =
      payload;
    addBreadcrumb('Payload parsed', 'data', {
      assistant_id: assistantId,
      has_summary: !!summary,
      has_phone: !!phoneNumber,
      has_caller_name: !!callerName,
      has_call_analysis: !!callAnalysis,
    });
    if (typeof assistantId !== 'string' || assistantId.trim().length === 0) {
      const error = new Error('Invalid assistantId');
      captureException(error, {
        function: 'send-email-summary',
        assistant_id: assistantId,
        assistant_id_type: typeof assistantId,
      });
      return new Response('Invalid assistantId', {
        status: 400,
      });
    }
    if (typeof summary !== 'string' || summary.trim().length === 0) {
      const error = new Error('Invalid summary');
      captureException(error, {
        function: 'send-email-summary',
        summary_type: typeof summary,
        summary_length: summary?.length || 0,
      });
      return new Response('Invalid summary', {
        status: 400,
      });
    }
    if (phoneNumber !== undefined && typeof phoneNumber !== 'string') {
      const error = new Error('Invalid phoneNumber');
      captureException(error, {
        function: 'send-email-summary',
        phone_number_type: typeof phoneNumber,
      });
      return new Response('Invalid phoneNumber', {
        status: 400,
      });
    }
    setTag('function', 'send-email-summary');
    setTag('assistant_id', assistantId);
    /* a. Resolve user & email preferences -------------------------------- */ addBreadcrumb(
      'Fetching user settings',
      'database',
      {
        assistant_id: assistantId,
      }
    );
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('id,email_notifications')
      .eq('vapi_assistant_id', assistantId)
      .maybeSingle();
    if (!userSettings || userSettings.email_notifications === false) {
      addBreadcrumb('Email notifications disabled or user not found', 'email', {
        user_found: !!userSettings,
        email_notifications: userSettings?.email_notifications,
      });
      return new Response(
        JSON.stringify({
          skipped: true,
        }),
        {
          status: 200,
        }
      );
    }
    const userId = userSettings.id;
    setUser(userId);
    addBreadcrumb('Fetching user profile', 'database', {
      user_id: userId,
    });
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();
    if (!profile?.email) {
      addBreadcrumb('No email found for user', 'email', {
        user_id: userId,
      });
      return new Response(
        JSON.stringify({
          skipped: true,
        }),
        {
          status: 200,
        }
      );
    }
    addBreadcrumb('User profile found', 'database', {
      user_id: userId,
      email: profile.email,
    });
    /* b. Render React template to HTML ------------------------------------ */ addBreadcrumb(
      'Rendering email template',
      'template'
    );
    const baseUrl = Deno.env.get('BASE_URL') ?? 'https://www.spoqen.com';
    // Use site-hosted assets so emails always use the current branding
    const logoUrl = `${baseUrl}/Icon.png`;
    const fullLogoUrl = `${baseUrl}/Spoqen (2).png`;
    const html = renderToStaticMarkup(
      React.createElement(CallSummaryEmail, {
        summary,
        phoneNumber,
        callerName,
        callAnalysis,
        logoUrl,
        fullLogoUrl,
        dashboardUrl: `${baseUrl}/recent-calls`,
      })
    );
    addBreadcrumb('Email template rendered', 'template', {
      html_length: html.length,
      base_url: baseUrl,
    });
    /* c. Send email via Brevo REST API --------------------------------- */ const apiKey =
      Deno.env.get('BREVO_API_KEY');
    const from = Deno.env.get('FROM_EMAIL');
    addBreadcrumb('Sending email via Brevo', 'email', {
      to: profile.email,
      from: from,
    });
    try {
      const brevoResp = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify({
          sender: {
            email: from,
            name: 'Spoqen',
          },
          to: [
            {
              email: profile.email,
            },
          ],
          subject: '[Spoqen] Complete Call Details Report',
          textContent: summary,
          htmlContent: html,
        }),
      });
      if (!brevoResp.ok) {
        const errText = await brevoResp.text();
        const error = new Error(`Brevo error: ${brevoResp.status} ${errText}`);
        captureException(error, {
          function: 'send-email-summary',
          operation: 'brevo_api',
          user_id: userId,
          brevo_status: brevoResp.status,
          brevo_response: errText,
        });
        console.error('Brevo error', {
          status: brevoResp.status,
          body: errText,
        });
        return new Response('Email send failed', {
          status: 502,
        });
      }
      addBreadcrumb('Email sent successfully', 'email', {
        user_id: userId,
        brevo_status: brevoResp.status,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Brevo fetch error');
      captureException(error, {
        function: 'send-email-summary',
        operation: 'brevo_fetch',
        user_id: userId,
      });
      console.error('Brevo fetch threw', err);
      return new Response('Email send encountered an error', {
        status: 500,
      });
    }
    addBreadcrumb('Email summary completed successfully', 'email', {
      user_id: userId,
      assistant_id: assistantId,
    });
    return new Response(
      JSON.stringify({
        sent: true,
      }),
      {
        status: 200,
      }
    );
  } catch (error) {
    const sentryError =
      error instanceof Error
        ? error
        : new Error('Unexpected error in send-email-summary');
    captureException(sentryError, {
      function: 'send-email-summary',
      operation: 'main_handler',
    });
    console.error('Unexpected error in send-email-summary:', error);
    return new Response('Internal server error', {
      status: 500,
    });
  } finally {
    if (transaction) {
      transaction.finish();
    }
  }
});
