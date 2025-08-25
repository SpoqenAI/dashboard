// Minimal Deno ambient to satisfy non-Deno type checkers
declare const Deno: { env: { get: (name: string) => string | undefined } };

// @ts-expect-error Deno resolves remote module types at runtime
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// @ts-expect-error Deno resolves remote module types at runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @ts-expect-error Deno resolves remote module types at runtime
import React from 'https://esm.sh/react@18.3.1';
// @ts-expect-error Deno resolves remote module types at runtime
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
// Types -----------------------------------------------------------------------
// Shape of AI call analysis. Mirrors the props expected by the email template.
interface CallAnalysis {
  sentiment?: 'positive' | 'negative' | 'neutral';
  leadQuality?: 'hot' | 'warm' | 'cold';
  leadQualityReasoning?: string;
  sentimentAnalysisReasoning?: string;
  callPurpose?: string;
  keyPoints?: string[];
  urgentConcerns?: string[];
  followUpItems?: string[];
  businessInterest?: string;
  timeline?: string;
  budgetMentioned?: boolean;
  decisionMaker?: boolean;
  appointmentRequested?: boolean;
  contactPreference?: string;
}

// Incoming HTTP payload
interface SendEmailSummaryPayload {
  assistantId: string;
  summary: string;
  phoneNumber?: string;
  callerName?: string;
  callAnalysis?: CallAnalysis;
}

// Minimal row shapes for queried tables
interface UserSettingsRow {
  id: string;
  email_notifications: boolean | null;
}

interface ProfileRow {
  email: string | null;
}

// Minimal Sentry transaction contract used here
interface SentryTransactionLike {
  finish: () => void;
}

// Type guards -----------------------------------------------------------------
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringOrUndefined(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function isCallAnalysis(value: unknown): value is CallAnalysis {
  if (!isRecord(value)) return false;
  const v = value as Record<string, unknown>;
  if (
    v.sentiment !== undefined &&
    v.sentiment !== 'positive' &&
    v.sentiment !== 'negative' &&
    v.sentiment !== 'neutral'
  )
    return false;
  if (
    v.leadQuality !== undefined &&
    v.leadQuality !== 'hot' &&
    v.leadQuality !== 'warm' &&
    v.leadQuality !== 'cold'
  )
    return false;
  if (
    !isStringOrUndefined(v.leadQualityReasoning) ||
    !isStringOrUndefined(v.sentimentAnalysisReasoning) ||
    !isStringOrUndefined(v.callPurpose) ||
    (v.keyPoints !== undefined && !isStringArray(v.keyPoints)) ||
    (v.urgentConcerns !== undefined && !isStringArray(v.urgentConcerns)) ||
    (v.followUpItems !== undefined && !isStringArray(v.followUpItems)) ||
    !isStringOrUndefined(v.businessInterest) ||
    !isStringOrUndefined(v.timeline) ||
    (v.budgetMentioned !== undefined &&
      typeof v.budgetMentioned !== 'boolean') ||
    (v.decisionMaker !== undefined && typeof v.decisionMaker !== 'boolean') ||
    (v.appointmentRequested !== undefined &&
      typeof v.appointmentRequested !== 'boolean') ||
    !isStringOrUndefined(v.contactPreference)
  )
    return false;
  return true;
}
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
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);
serve(async (req: Request): Promise<Response> => {
  const transaction = startTransaction(
    'send-email-summary',
    'email'
  ) as SentryTransactionLike | null;
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
    let payloadUnknown: unknown;
    try {
      payloadUnknown = await req.json();
    } catch (error) {
      captureException(error as Error, { function: 'send-email-summary' });
      return new Response('Invalid JSON payload', { status: 400 });
    }
    if (typeof payloadUnknown !== 'object' || payloadUnknown === null) {
      const error = new Error('Invalid JSON payload');
      captureException(error, { function: 'send-email-summary' });
      return new Response('Invalid JSON payload', { status: 400 });
    }
    const { assistantId, summary, phoneNumber, callerName, callAnalysis } =
      payloadUnknown as Record<string, unknown>;
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
    if (callerName !== undefined && typeof callerName !== 'string') {
      const error = new Error('Invalid callerName');
      captureException(error, {
        function: 'send-email-summary',
        caller_name_type: typeof callerName,
      });
      return new Response('Invalid callerName', { status: 400 });
    }
    if (callAnalysis !== undefined) {
      if (!isCallAnalysis(callAnalysis)) {
        const error = new Error('Invalid callAnalysis');
        captureException(error, {
          function: 'send-email-summary',
        });
        return new Response('Invalid callAnalysis', { status: 400 });
      }
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
    const typedUserSettings = userSettings as unknown as UserSettingsRow | null;
    if (!typedUserSettings || typedUserSettings.email_notifications === false) {
      addBreadcrumb('Email notifications disabled or user not found', 'email', {
        user_found: !!typedUserSettings,
        email_notifications: typedUserSettings?.email_notifications,
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
    const userId = typedUserSettings.id;
    setUser(userId);
    addBreadcrumb('Fetching user profile', 'database', {
      user_id: userId,
    });
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();
    const typedProfile = profile as unknown as ProfileRow | null;
    if (!typedProfile?.email) {
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
      email_present: true,
      email_domain: typedProfile.email.includes('@')
        ? typedProfile.email.split('@')[1]
        : 'unknown',
    });
    /* b. Render React template to HTML ------------------------------------ */ addBreadcrumb(
      'Rendering email template',
      'template'
    );
    const baseUrl = Deno.env.get('BASE_URL') ?? 'https://www.spoqen.com';
    // Use site-hosted assets so emails always use the current branding
    const logoUrl = `${baseUrl}/Icon.png`;
    const fullLogoUrl = `${baseUrl}/Spoqen (2).png`;
    const html: string = renderToStaticMarkup(
      React.createElement(CallSummaryEmail, {
        summary: summary as string,
        phoneNumber: typeof phoneNumber === 'string' ? phoneNumber : undefined,
        callerName: typeof callerName === 'string' ? callerName : undefined,
        callAnalysis: callAnalysis as CallAnalysis | undefined,
        logoUrl,
        fullLogoUrl,
        dashboardUrl: `${baseUrl}/recent-calls`,
      })
    );
    addBreadcrumb('Email template rendered', 'template', {
      base_url: baseUrl,
    });
    /* c. Send email via Brevo REST API --------------------------------- */ const apiKey =
      Deno.env.get('BREVO_API_KEY')!;
    const from = Deno.env.get('FROM_EMAIL')!;
    addBreadcrumb('Sending email via Brevo', 'email', {
      to_present: Boolean(typedProfile.email),
      to_domain:
        typeof typedProfile.email === 'string' &&
        typedProfile.email.includes('@')
          ? typedProfile.email.split('@')[1]
          : 'unknown',
      from_domain: from.split('@')[1] ?? 'unknown',
    });
    try {
      const brevoResp = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: new Headers({
          'Content-Type': 'application/json',
          'api-key': apiKey,
        }),
        body: JSON.stringify({
          sender: {
            email: from,
            name: 'Spoqen',
          },
          to: [
            {
              email: typedProfile.email,
            },
          ],
          subject: '[Spoqen] Complete Call Details Report',
          textContent: summary,
          htmlContent: html,
        }),
      });
      if (!brevoResp.ok) {
        const errText = await brevoResp.text();
        const error = new Error(`Brevo error: ${brevoResp.status}`);
        captureException(error, {
          function: 'send-email-summary',
          operation: 'brevo_api',
          user_id: userId,
          brevo_status: brevoResp.status,
          // Avoid sending provider body (could contain PII)
          brevo_response_length: errText?.length ?? 0,
        });
        // Avoid noisy console logging in production functions
        if (Deno.env.get('ENVIRONMENT') !== 'production') {
          console.error('Brevo error', {
            status: brevoResp.status,
            response_length: errText?.length ?? 0,
          });
        }
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
      if (Deno.env.get('ENVIRONMENT') !== 'production') {
        console.error('Brevo fetch threw', err);
      }
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
    if (Deno.env.get('ENVIRONMENT') !== 'production') {
      console.error('Unexpected error in send-email-summary:', error);
    }
    return new Response('Internal server error', {
      status: 500,
    });
  } finally {
    if (transaction) {
      transaction.finish();
    }
  }
});
