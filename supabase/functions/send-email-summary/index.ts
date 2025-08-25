import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { Database } from '../_shared/types/supabase.ts';
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

// (Row types now provided by generated Database type)

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
// Early format validation for FROM_EMAIL to fail fast with a clear error
const fromEmailEnv = Deno.env.get('FROM_EMAIL')!;
// Simple RFC5322-ish email validation suitable for config checks
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!EMAIL_RE.test(fromEmailEnv)) {
  const error = new Error('Invalid FROM_EMAIL format');
  captureException(error, {
    function: 'send-email-summary',
    invalid_env_var: 'FROM_EMAIL',
  });
  throw error;
}
const supabase = createClient<Database>(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Response helpers to ensure consistent CORS + JSON
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '600',
} as const;

function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

function optionsResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      ...CORS_HEADERS,
    },
  });
}
serve(async (req: Request): Promise<Response> => {
  const transaction = startTransaction(
    'send-email-summary',
    'email'
  ) as SentryTransactionLike | null;
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return optionsResponse();
    }
    if (req.method !== 'POST') {
      addBreadcrumb('Invalid method', 'validation', {
        method: req.method,
      });
      return jsonResponse({ error: 'Method Not Allowed' }, 405, {
        Allow: 'POST, OPTIONS',
      });
    }
    addBreadcrumb('Request received', 'http', {
      method: req.method,
    });
    let payloadUnknown: unknown;
    try {
      payloadUnknown = await req.json();
    } catch (_error) {
      addBreadcrumb('Invalid JSON payload', 'validation', {
        reason: 'json_parse_error',
      });
      return jsonResponse({ error: 'Invalid JSON payload' }, 400);
    }
    if (typeof payloadUnknown !== 'object' || payloadUnknown === null) {
      addBreadcrumb('Invalid JSON payload', 'validation', {
        reason: 'non_object_body',
      });
      return jsonResponse({ error: 'Invalid JSON payload' }, 400);
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
      addBreadcrumb('Invalid assistantId', 'validation', {
        assistant_id: assistantId,
        assistant_id_type: typeof assistantId,
      });
      return jsonResponse({ error: 'Invalid assistantId' }, 400);
    }
    if (typeof summary !== 'string' || summary.trim().length === 0) {
      addBreadcrumb('Invalid summary', 'validation', {
        summary_type: typeof summary,
      });
      return jsonResponse({ error: 'Invalid summary' }, 400);
    }
    if (phoneNumber !== undefined && typeof phoneNumber !== 'string') {
      addBreadcrumb('Invalid phoneNumber', 'validation', {
        phone_number_type: typeof phoneNumber,
      });
      return jsonResponse({ error: 'Invalid phoneNumber' }, 400);
    }
    if (callerName !== undefined && typeof callerName !== 'string') {
      addBreadcrumb('Invalid callerName', 'validation', {
        caller_name_type: typeof callerName,
      });
      return jsonResponse({ error: 'Invalid callerName' }, 400);
    }
    if (callAnalysis !== undefined) {
      if (!isCallAnalysis(callAnalysis)) {
        addBreadcrumb('Invalid callAnalysis', 'validation', {});
        return jsonResponse({ error: 'Invalid callAnalysis' }, 400);
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
    const { data: userSettings, error: userSettingsError } = await supabase
      .from('user_settings')
      .select('id,email_notifications')
      .eq('vapi_assistant_id', assistantId)
      .maybeSingle();
    if (userSettingsError) {
      captureException(
        userSettingsError instanceof Error
          ? userSettingsError
          : new Error('User settings query error'),
        {
          function: 'send-email-summary',
          operation: 'fetch_user_settings',
          assistant_id: assistantId,
          db_error_code:
            (userSettingsError as { code?: string } | null)?.code ?? 'unknown',
        }
      );
      return jsonResponse(
        { error: 'Database error fetching user settings' },
        500
      );
    }
    if (!userSettings) {
      addBreadcrumb('User not found for assistant', 'email', {
        user_found: false,
      });
      return jsonResponse(
        { skipped: true, skipped_reason: 'user_not_found' },
        200
      );
    }
    if (userSettings.email_notifications === false) {
      addBreadcrumb('Email notifications disabled', 'email', {
        user_found: true,
        email_notifications: false,
      });
      return jsonResponse(
        { skipped: true, skipped_reason: 'notifications_disabled' },
        200
      );
    }
    const userId = userSettings.id;
    setUser(userId);
    addBreadcrumb('Fetching user profile', 'database', {
      user_id: userId,
    });
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .maybeSingle();
    if (profileError) {
      captureException(
        profileError instanceof Error
          ? profileError
          : new Error('Profile query error'),
        {
          function: 'send-email-summary',
          operation: 'fetch_profile',
          user_id: userId,
          db_error_code:
            (profileError as { code?: string } | null)?.code ?? 'unknown',
        }
      );
      return jsonResponse({ error: 'Database error fetching profile' }, 500);
    }
    if (!profile?.email) {
      addBreadcrumb('No email found for user', 'email', {
        user_id: userId,
      });
      return jsonResponse(
        { skipped: true, skipped_reason: 'missing_email' },
        200
      );
    }
    addBreadcrumb('User profile found', 'database', {
      user_id: userId,
      email_present: true,
      email_domain: profile.email.includes('@')
        ? profile.email.split('@')[1].toLowerCase()
        : 'unknown',
    });
    /* b. Render React template to HTML ------------------------------------ */ addBreadcrumb(
      'Rendering email template',
      'template'
    );
    // Normalize BASE_URL by removing trailing slashes to prevent double slashes in links
    const baseUrl = (
      Deno.env.get('BASE_URL') ?? 'https://www.spoqen.com'
    ).replace(/\/+$/, '');
    // Use site-hosted assets so emails always use the current branding
    const logoUrl = `${baseUrl}/Icon.png`;
    // Encode filename to avoid issues with spaces/parentheses in email clients
    const fullLogoUrl = `${baseUrl}/${encodeURIComponent('Spoqen (2).png')}`;
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
    const userEmail = profile.email;
    addBreadcrumb('Sending email via Brevo', 'email', {
      to_present: Boolean(userEmail),
      to_domain: userEmail.includes('@')
        ? userEmail.split('@')[1].toLowerCase()
        : 'unknown',
      from_domain: (from.split('@')[1] ?? 'unknown').toLowerCase(),
    });
    try {
      // Add a timeout to prevent hanging on network hiccups
      const brevoTimeoutMsRaw = Deno.env.get('BREVO_TIMEOUT_MS');
      const brevoTimeoutMs = (() => {
        const n = Number(brevoTimeoutMsRaw);
        return Number.isFinite(n) && n > 0 ? n : 10000; // default 10s
      })();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), brevoTimeoutMs);
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
              email: userEmail,
            },
          ],
          subject: '[Spoqen] Complete Call Details Report',
          textContent: summary,
          htmlContent: html,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId as unknown as number);
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
        return jsonResponse({ error: 'Email send failed' }, 502);
      }
      addBreadcrumb('Email sent successfully', 'email', {
        user_id: userId,
        brevo_status: brevoResp.status,
      });
    } catch (err) {
      // Specifically handle AbortError from timeout
      if ((err as { name?: string } | null)?.name === 'AbortError') {
        captureException(
          err instanceof Error ? err : new Error('Brevo fetch timeout'),
          {
            function: 'send-email-summary',
            operation: 'brevo_timeout',
            user_id: userId,
          }
        );
        if (Deno.env.get('ENVIRONMENT') !== 'production') {
          console.error('Brevo fetch timed out', err);
        }
        return jsonResponse({ error: 'Email send timed out' }, 504);
      }
      const error = err instanceof Error ? err : new Error('Brevo fetch error');
      captureException(error, {
        function: 'send-email-summary',
        operation: 'brevo_fetch',
        user_id: userId,
      });
      if (Deno.env.get('ENVIRONMENT') !== 'production') {
        console.error('Brevo fetch threw', err);
      }
      return jsonResponse({ error: 'Email send encountered an error' }, 500);
    }
    addBreadcrumb('Email summary completed successfully', 'email', {
      user_id: userId,
      assistant_id: assistantId,
    });
    return jsonResponse({ sent: true }, 200);
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
    return jsonResponse({ error: 'Internal server error' }, 500);
  } finally {
    if (transaction) {
      transaction.finish();
    }
  }
});
