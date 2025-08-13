// @ts-nocheck
/**
 * Supabase Edge Function: vapi-assistant-provision
 *
 * This function provisions a VAPI assistant for a user immediately after email confirmation.
 * It is called directly (via HTTP POST) with { user_id, email } and:
 *   1. Checks if the user already has a vapi_assistant_id (idempotent)
 *   2. If not, provisions a new VAPI assistant via the VAPI API
 *   3. Updates public.user_settings.vapi_assistant_id with the new assistant ID
 *
 * There is no queue or pending table. All provisioning is immediate and direct.
 *
 * Security: Requires x-webhook-secret header for authentication.
 *
 * Maintainer notes:
 * - This function is called by a Postgres trigger or backend job after email confirmation.
 * - All error handling and logging is done via Sentry and HTTP responses.
 */
// Supabase Edge Function: vapi-assistant-provision (Direct version, x-webhook-secret only)
// Accepts POST { user_id, email } and provisions VAPI assistant directly
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import {
  initSentry,
  captureException,
  addBreadcrumb,
  setUser,
  setTag,
  startTransaction,
} from '../_shared/sentry.ts';
import {
  ensureTerminationPolicyAppended,
  TERMINATION_POLICY_SENTINEL,
  TERMINATION_DISPLAY_NAME_FALLBACK,
} from '../_shared/termination-policy.ts';
// Sanitizes user-provided display names to a single-line, bounded string
function sanitizeSingleLineBounded(name: string, maxLen: number = 64): string {
  if (typeof name !== 'string') return '';
  const limit = Number.isFinite(maxLen) && maxLen > 0 ? Math.floor(maxLen) : 64;
  let result = '';
  let prevWasSpace = false;
  for (let i = 0; i < name.length; i++) {
    const code = name.charCodeAt(i);
    let ch = name[i];
    // Map CR, LF, TAB to a space; drop other ASCII control chars (including DEL)
    if (code === 9 || code === 10 || code === 13) {
      ch = ' ';
    } else if (code < 32 || code === 127) {
      continue;
    }
    // Collapse consecutive spaces and avoid leading spaces
    if (ch === ' ') {
      if (prevWasSpace || result.length === 0) {
        prevWasSpace = true;
        continue;
      }
      prevWasSpace = true;
    } else {
      prevWasSpace = false;
    }
    result += ch;
    if (result.length >= limit) break;
  }
  // Trim trailing space
  if (result.endsWith(' ')) result = result.slice(0, -1);
  return result;
}
// Fetch helper with timeout to prevent hanging HTTP calls
async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {},
  timeoutMs = 15000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    init.timeoutMs ?? timeoutMs
  );
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
// Lightweight typing for canonical config to prevent drift
interface AnalysisPlanJson {
  version: string;
  plan: {
    summaryPrompt: string;
    structuredDataPrompt: string;
    structuredDataSchema: {
      type: 'object';
      additionalProperties: boolean;
      properties: Record<string, unknown>;
      required: string[];
    };
    successEvaluationPrompt: string;
    successEvaluationRubric: 'PassFail' | string;
  };
}

interface DefaultsJson {
  model: {
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
    emotionRecognitionEnabled?: boolean;
  };
}
// Inline fallbacks to ensure provisioning always applies the canonical config
// These are used only if local JSON files cannot be read at runtime (e.g. packaging/runtime path issues)
const INLINE_DEFAULTS_JSON: DefaultsJson = {
  model: {
    provider: 'openai',
    model: 'gpt-5-nano',
    temperature: 1.1,
    maxTokens: 10000,
    emotionRecognitionEnabled: true,
  },
} as const;

const INLINE_ANALYSIS_PLAN_JSON: AnalysisPlanJson = {
  version: '1.0.1',
  plan: {
    summaryPrompt:
      "You are an expert call analyst. Summarize this call in 2-3 sentences, focusing on the caller's main purpose, key discussion points, and any outcomes or next steps.",
    structuredDataPrompt:
      'You are an expert data extractor for business calls. Extract structured data from this call transcript focusing on lead qualification, customer intent, and business opportunities. Provide reasoning for your sentiment and lead quality assessments when possible.',
    structuredDataSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        sentiment: {
          type: 'string',
          enum: ['positive', 'neutral', 'negative'],
          description: 'Overall sentiment of the caller',
        },
        leadQuality: {
          type: 'string',
          enum: ['hot', 'warm', 'cold'],
          description: 'Quality of the lead based on interest and urgency',
        },
        callPurpose: {
          type: 'string',
          description: 'Main reason for the call',
        },
        keyPoints: {
          type: 'array',
          items: { type: 'string' },
          description: 'Important points discussed during the call',
        },
        followUpItems: {
          type: 'array',
          items: { type: 'string' },
          description: 'Action items or follow-up tasks identified',
        },
        urgentConcerns: {
          type: 'array',
          items: { type: 'string' },
          description: 'Any urgent issues or time-sensitive matters',
        },
        appointmentRequested: {
          type: 'boolean',
          description: 'Whether the caller requested an appointment or meeting',
        },
        timeline: {
          type: 'string',
          description:
            'Timeframe mentioned by caller (immediate, within a week, month, etc.)',
        },
        contactPreference: {
          type: 'string',
          description: 'Preferred method of contact (phone, email, text, etc.)',
        },
        businessInterest: {
          type: 'string',
          description: 'Specific business interest or service inquired about',
        },
        budgetMentioned: {
          type: 'boolean',
          description: 'Whether budget or pricing was discussed',
        },
        decisionMaker: {
          type: 'boolean',
          description: 'Whether the caller appears to be a decision maker',
        },
        sentimentAnalysisReasoning: {
          type: 'string',
          description:
            'Brief explanation of why this sentiment was assigned based on conversation tone and language patterns.',
        },
        leadQualityReasoning: {
          type: 'string',
          description:
            'Brief explanation of why this lead quality score was assigned based on engagement and interest signals.',
        },
      },
      required: ['sentiment', 'leadQuality', 'callPurpose'],
    },
    successEvaluationPrompt:
      'Evaluate if this call was successful based on: 1) Did the caller get their questions answered? 2) Was relevant information exchanged? 3) Were next steps established? 4) Did the conversation flow naturally without technical issues?',
    successEvaluationRubric: 'PassFail',
  },
} as const;
// Load canonical analysis plan without static JSON import assertions (Biome-safe, Deno-friendly)
let cachedAnalysisPlanJson: AnalysisPlanJson | null = null;
async function getCanonicalAnalysisPlanJson(): Promise<AnalysisPlanJson> {
  if (cachedAnalysisPlanJson) return cachedAnalysisPlanJson;
  try {
    const planUrl = new URL(
      '../_shared/vapi-assistant.plan.json',
      import.meta.url
    );
    const planText = await Deno.readTextFile(planUrl);
    cachedAnalysisPlanJson = JSON.parse(planText) as AnalysisPlanJson;
    return cachedAnalysisPlanJson;
  } catch (err) {
    // Fallback: try local file inside function directory
    try {
      const planUrlLocal = new URL(
        './vapi-assistant.plan.json',
        import.meta.url
      );
      const planTextLocal = await Deno.readTextFile(planUrlLocal);
      cachedAnalysisPlanJson = JSON.parse(planTextLocal) as AnalysisPlanJson;
      return cachedAnalysisPlanJson;
    } catch (err2) {
      // Final fallback: inline plan to keep provisioned assistants in sync with system defaults
      const primaryPath = new URL(
        '../_shared/vapi-assistant.plan.json',
        import.meta.url
      ).toString();
      const fallbackPath = new URL(
        './vapi-assistant.plan.json',
        import.meta.url
      ).toString();
      addBreadcrumb(
        'Analysis plan load failed, using inline fallback',
        'config',
        {
          firstErrorMessage: err instanceof Error ? err.message : String(err),
          secondErrorMessage:
            err2 instanceof Error ? err2.message : String(err2),
          firstError:
            err instanceof Error
              ? { name: err.name, stack: err.stack }
              : String(err),
          secondError:
            err2 instanceof Error
              ? { name: err2.name, stack: err2.stack }
              : String(err2),
          attemptedPaths: [primaryPath, fallbackPath],
        }
      );
      // Deep clone to avoid accidental mutation of inline constants
      cachedAnalysisPlanJson = JSON.parse(
        JSON.stringify(INLINE_ANALYSIS_PLAN_JSON)
      ) as AnalysisPlanJson;
      return cachedAnalysisPlanJson;
    }
  }
}

// Load canonical model defaults (provider/model/temperature/maxTokens)
let cachedDefaultsJson: DefaultsJson | null = null;
async function getCanonicalDefaultsJson(): Promise<DefaultsJson> {
  if (cachedDefaultsJson) return cachedDefaultsJson;
  try {
    const defaultsUrl = new URL(
      '../_shared/vapi-assistant.defaults.json',
      import.meta.url
    );
    const defaultsText = await Deno.readTextFile(defaultsUrl);
    cachedDefaultsJson = JSON.parse(defaultsText) as DefaultsJson;
    return cachedDefaultsJson;
  } catch (err) {
    // Fallback: try local file inside function directory
    try {
      const defaultsUrlLocal = new URL(
        './vapi-assistant.defaults.json',
        import.meta.url
      );
      const defaultsTextLocal = await Deno.readTextFile(defaultsUrlLocal);
      cachedDefaultsJson = JSON.parse(defaultsTextLocal) as DefaultsJson;
      return cachedDefaultsJson;
    } catch (err2) {
      // Final fallback: inline defaults to keep provisioned assistants in sync with system defaults
      const primaryPath = new URL(
        '../_shared/vapi-assistant.defaults.json',
        import.meta.url
      ).toString();
      const fallbackPath = new URL(
        './vapi-assistant.defaults.json',
        import.meta.url
      ).toString();
      addBreadcrumb('Defaults load failed, using inline fallback', 'config', {
        firstErrorMessage: err instanceof Error ? err.message : String(err),
        secondErrorMessage: err2 instanceof Error ? err2.message : String(err2),
        firstError:
          err instanceof Error
            ? { name: err.name, stack: err.stack }
            : String(err),
        secondError:
          err2 instanceof Error
            ? { name: err2.name, stack: err2.stack }
            : String(err2),
        attemptedPaths: [primaryPath, fallbackPath],
      });
      // Deep clone to avoid accidental mutation of inline constants
      cachedDefaultsJson = JSON.parse(
        JSON.stringify(INLINE_DEFAULTS_JSON)
      ) as DefaultsJson;
      return cachedDefaultsJson;
    }
  }
}

// Only log service role info when DEBUG_PROVISION=1
const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
if (Deno.env.get('DEBUG_PROVISION') === '1') {
  console.log(
    '[DEBUG] SERVICE_ROLE_KEY defined:',
    !!serviceRoleKey,
    '| Length:',
    serviceRoleKey?.length ?? 0
  );
}

// Initialize Sentry at the top level
initSentry();

const SUPABASE_URL = globalThis.Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = globalThis.Deno.env.get('SERVICE_ROLE_KEY');
const VAPI_API_KEY = globalThis.Deno.env.get('VAPI_PRIVATE_KEY');
const VAPI_WEBHOOK_SECRET = globalThis.Deno.env.get('VAPI_WEBHOOK_SECRET');
const WEBHOOK_SECRET = globalThis.Deno.env.get('WEBHOOK_SECRET');

// For debugging (flagged)
if (Deno.env.get('DEBUG_PROVISION') === '1') {
  console.log('[DEBUG] Environment variables check:', {
    SUPABASE_URL: !!SUPABASE_URL,
    SERVICE_ROLE_KEY: !!SERVICE_ROLE_KEY,
    VAPI_PRIVATE_KEY: !!VAPI_API_KEY,
    VAPI_WEBHOOK_SECRET: !!VAPI_WEBHOOK_SECRET,
    WEBHOOK_SECRET: !!WEBHOOK_SECRET,
  });
}

if (
  !SUPABASE_URL ||
  !SERVICE_ROLE_KEY ||
  !VAPI_API_KEY ||
  !VAPI_WEBHOOK_SECRET ||
  !WEBHOOK_SECRET
) {
  const error = new Error('Missing required environment variables');
  captureException(error, {
    function: 'vapi-assistant-provision',
    missing_vars: {
      SUPABASE_URL: !!SUPABASE_URL,
      SERVICE_ROLE_KEY: !!SERVICE_ROLE_KEY,
      VAPI_PRIVATE_KEY: !!VAPI_API_KEY,
      VAPI_WEBHOOK_SECRET: !!VAPI_WEBHOOK_SECRET,
      WEBHOOK_SECRET: !!WEBHOOK_SECRET,
    },
  });
  throw error;
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (req: Request) => {
  const transaction = startTransaction('vapi-assistant-provision', 'webhook');

  try {
    const rawHeaders = Object.fromEntries(req.headers.entries());
    const redactedHeaders = Object.fromEntries(
      Object.entries(rawHeaders).map(([k, v]) => {
        const key = k.toLowerCase();
        return [
          'authorization',
          'cookie',
          'set-cookie',
          'x-webhook-secret',
          'x-api-key',
        ].includes(key)
          ? [k, '[REDACTED]']
          : [k, v];
      })
    );
    addBreadcrumb('Request received', 'http', {
      method: req.method,
      headers: redactedHeaders,
    });

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
      return new Response(
        JSON.stringify({
          error: 'Unauthorized: missing or invalid webhook secret',
        }),
        { status: 401 }
      );
    }

    // Parse payload
    let payload;
    try {
      payload = await req.json();
      addBreadcrumb('Payload parsed', 'data', {
        payload_keys: Object.keys(payload),
      });
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Invalid JSON payload');
      captureException(error, {
        function: 'vapi-assistant-provision',
        payload_length: req.body ? 'present' : 'missing',
      });
      return new Response(
        JSON.stringify({
          error: 'Invalid JSON payload',
          details: 'An unexpected error occurred',
        }),
        { status: 400 }
      );
    }

    // Extract user_id and email
    const { user_id, email } = payload || {};
    if (!user_id || !email) {
      const error = new Error('Missing required user_id or email');
      captureException(error, {
        function: 'vapi-assistant-provision',
        row_data: { user_id, email },
        payload: payload,
      });
      return new Response(
        JSON.stringify({
          error: 'Missing required user_id or email',
          details: { user_id, email },
        }),
        { status: 400 }
      );
    }

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
      const error =
        e instanceof Error ? e : new Error('Exception fetching user profile');
      captureException(error, {
        function: 'vapi-assistant-provision',
        operation: 'fetch_profile',
        user_id,
      });
    }
    // Sanitize displayName before using it in prompts/logs: single-line, bounded
    {
      const baseName =
        typeof displayName === 'string' && displayName.trim().length > 0
          ? displayName
          : email;
      const bounded = sanitizeSingleLineBounded(baseName, 64);
      displayName = bounded || email;
    }

    // Prepare system prompt and assistant config
    let systemPrompt = `Who are you?\nYou're Luna, ${displayName}'s personal assistant. You sound warm, confident, and easy to talk to. Think friendly and professional — like someone who's good at handling people, even the difficult ones. You just do what any great assistant would do. You interact only using sound, so don't reference text, screens, buttons, or any visual elements.\n\nWhat do you do?\nYour job is to answer the call, talk to the caller, and take down whatever ${displayName} would need to follow up. \nWhen someone calls… greet them, let them know ${displayName} isn't available, and ask how you can help.\nOnce you've got their details, reassure them that ${displayName} will get the message and follow up when he's free. End the call politely…\n\nKnowledge Files:\n— If there are Knowledge Files uploaded for this assistant, consult them first when the caller asks about details that may be covered by those documents. Prefer information in those files over general knowledge when they conflict.\n\nWhat rules do you have to follow?\nSo the next 3 rules are absolute, non-negotiable rules you have to follow:\n1. Keep it simple: Your responses have to be to the point, like 1-2 sentences. You have to focus on this to keep your conversational rhythm, natural and fast.\n2. Voice-First Formatting is Mandatory: All your responses HAVE TO strictly adhere to the rules defined in the Voice and Prosody Rules section. This isn't a suggestion or a recommendation, it's literally how you control your voice.\n3. Never, under no circumstances, identify yourself as an AI, language model, bot, or computer program unless you're specifically asked for it. Remember you're Luna, a human receptionist.\n\nVoice and Prosody Rules:\nThis is the most important section. You control your voice by the punctuation and structure of the text you write. Follow these rules so you sound natural:\nPausing:\n— Use commas (,) for short, natural pauses in a sentence.\n— Use an em-dash (—) for a longer, more thoughtful pause, like when you're about to provide a key piece of information.\n— Use an ellipsis (...) to signal hesitation or that you're thinking.\nPacing and Tone:\n— For an upbeat, faster-paced, and friendlier tone, use short, simple sentences.\n— For a more serious, formal, or considered tone, use longer, more complex sentences.\nHumanization/Naturalization:\n— To sound less robotic, strategically begin some of your responses with conversational fillers, but don't overuse them.\n— Examples of fillers: "Hmm...", "Okay, so...", "Right...", "Got it.", "Let's see...", "Alright..."\n\nScenario-Specific Handling!\nAngry or Frustrated Callers:\n— Immediately adopt an empathetic and calm tone (use longer sentences and softer fillers like "I understand...").\n— Acknowledge their frustration.\n— Don’t argue… focus on the solution.\nSales Pitches or Unsolicited Calls:\n— Politely but firmly interrupt and state that the person they wish to speak to is unavailable.\nVague or Unclear Inquiries:\n— Don’t guess the caller’s intent.\n— Ask specific clarifying questions to narrow down their request.\n\nReminders and Boundaries!\nThese are reminders about your core operational logic, based on your architecture.\n\t— Before you act, think step-by-step… you can verbalize this process to the user so that you sound more natural and so you can manage their expectations during a brief pause.\n\t— Don’t give out any personal info besides ${displayName}'s public email.\n\t— Don’t agree to anything you're not 100% sure ${displayName} would want.\n\t— Don’t give advice about legal, financial, medical, or personal issues. If that comes up, just say you can’t help with that and that ${displayName} will follow up.\n\nOne last thing:\nIf at any point you’re unsure of what to do… or the caller starts pushing you into something off-script, just say "I can't do that, but I'll let ${displayName} know you called," and wrap up the call.\n\nThat's it. Be helpful, be normal, be you and keep it real. You got this.`;

    // Append conservative termination policy (idempotent)
    try {
      systemPrompt = ensureTerminationPolicyAppended(
        systemPrompt,
        displayName || TERMINATION_DISPLAY_NAME_FALLBACK
      );
    } catch (_) {
      // Non-fatal; provisioning proceeds without policy if unexpected error
    }
    const firstMessage = `...Hi, thank you for calling ${displayName}. This is Luna, how can I help you today?...`;

    // Idempotency: check if user already has a vapi_assistant_id
    const { data: userSettings, error: userSettingsError } = await supabase
      .from('user_settings')
      .select('vapi_assistant_id')
      .eq('id', user_id)
      .maybeSingle();
    // ...existing code...
    if (userSettingsError) {
      captureException(userSettingsError, {
        function: 'vapi-assistant-provision',
        operation: 'fetch_user_settings',
        user_id,
      });
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch user_settings',
          details: 'An unexpected error occurred',
        }),
        { status: 500 }
      );
    }
    if (userSettings?.vapi_assistant_id) {
      return new Response(JSON.stringify({ message: 'Already provisioned' }), {
        status: 200,
      });
    }

    // Update status to pending
    const { error: pendingError } = await supabase
      .from('user_settings')
      .update({
        assistant_provisioning_status: 'pending',
        assistant_provisioning_started_at: new Date().toISOString(),
      })
      .eq('id', user_id);
    if (pendingError) {
      captureException(pendingError, {
        function: 'vapi-assistant-provision',
        operation: 'mark_pending',
        user_id,
      });
      return new Response(
        JSON.stringify({
          error: 'Failed to update provisioning status',
          details: 'An unexpected error occurred',
        }),
        { status: 500 }
      );
    }

    // Call VAPI API to create assistant
    let vapiAssistantId;
    try {
      const defaultsJson = await getCanonicalDefaultsJson();
      const userModelDefaults =
        (defaultsJson && (defaultsJson as any).model) || {};
      const modelDefaults = {
        provider:
          typeof userModelDefaults.provider === 'string'
            ? userModelDefaults.provider
            : 'openai',
        model:
          typeof userModelDefaults.model === 'string'
            ? userModelDefaults.model
            : 'gpt-5-nano',
        temperature:
          typeof userModelDefaults.temperature === 'number'
            ? userModelDefaults.temperature
            : 1.1,
        maxTokens:
          typeof userModelDefaults.maxTokens === 'number'
            ? userModelDefaults.maxTokens
            : 10000,
        emotionRecognitionEnabled:
          typeof userModelDefaults.emotionRecognitionEnabled === 'boolean'
            ? userModelDefaults.emotionRecognitionEnabled
            : true,
      };
      const modelOverrides = { ...modelDefaults } as Record<string, unknown>;

      const assistantConfig: any = {
        name: email,
        model: {
          ...modelOverrides,
          // Ensure default tools include endCall so the assistant can hang up
          tools: [{ type: 'endCall' }],
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
          ],
        },
        voice: {
          provider: 'deepgram',
          voiceId: 'luna',
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
        // Safety: keep a global hard limit as an additional guard
        // Calls should end automatically after this duration even if not terminated earlier
        maxDurationSeconds: 900,
        metadata: {
          assistantType: 'receptionist',
          version: '1.0',
        },
        server: {
          url: `${globalThis.Deno.env.get('NEXT_PUBLIC_SITE_URL') || globalThis.Deno.env.get('NEXT_PUBLIC_APP_URL') || 'https://spoqen.com'}/api/webhooks/vapi`,
          timeoutSeconds: 20,
        },
        serverMessages: ['end-of-call-report'],
      };

      // Load and attach analysis plan and version
      const analysisPlanJson = await getCanonicalAnalysisPlanJson();
      if (analysisPlanJson && analysisPlanJson.plan) {
        assistantConfig.analysisPlan = analysisPlanJson.plan;
        assistantConfig.metadata.analysisPlanVersion = analysisPlanJson.version;
      }

      // First attempt
      let vapiRes = await fetchWithTimeout(
        'https://api.vapi.ai/assistant',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${VAPI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(assistantConfig),
        },
        15_000
      );
      let vapiResText = await vapiRes.text();

      // Fallback strategy on validation errors (e.g., unsupported model or token limits)
      if (!vapiRes.ok && vapiRes.status >= 400 && vapiRes.status < 500) {
        addBreadcrumb(
          'Primary provision failed, applying fallback #1',
          'vapi',
          {
            status: vapiRes.status,
            body: vapiResText?.slice(0, 500),
          }
        );

        // Fallback #1: reduce maxTokens to a safer value
        try {
          const fallbackConfig1 = JSON.parse(JSON.stringify(assistantConfig));
          if (fallbackConfig1?.model) {
            fallbackConfig1.model.maxTokens = Math.min(
              Number(fallbackConfig1.model.maxTokens) || 10000,
              4000
            );
          }

          vapiRes = await fetchWithTimeout(
            'https://api.vapi.ai/assistant',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${VAPI_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(fallbackConfig1),
            },
            15_000
          );
          vapiResText = await vapiRes.text();
        } catch (_) {
          // ignore
        }

        // Fallback #2: switch to known-good model if still failing
        if (!vapiRes.ok) {
          addBreadcrumb('Fallback #1 failed, applying fallback #2', 'vapi', {
            status: vapiRes.status,
            body: vapiResText?.slice(0, 500),
          });
          try {
            const fallbackConfig2 = JSON.parse(JSON.stringify(assistantConfig));
            if (fallbackConfig2?.model) {
              fallbackConfig2.model.model = 'gpt-4.1-nano';
              fallbackConfig2.model.maxTokens = 250;
              // Some providers may not accept this flag
              if ('emotionRecognitionEnabled' in fallbackConfig2.model) {
                delete fallbackConfig2.model.emotionRecognitionEnabled;
              }
            }

            vapiRes = await fetchWithTimeout(
              'https://api.vapi.ai/assistant',
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${VAPI_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(fallbackConfig2),
              },
              15_000
            );
            vapiResText = await vapiRes.text();
          } catch (_) {
            // ignore
          }
        }
      }

      if (!vapiRes.ok) {
        const error = new Error(
          `VAPI API error: ${vapiRes.status} ${vapiResText}`
        );
        captureException(error, {
          function: 'vapi-assistant-provision',
          operation: 'create_vapi_assistant',
          user_id,
          vapi_status: vapiRes.status,
          vapi_response:
            typeof vapiResText === 'string'
              ? vapiResText.slice(0, 1000)
              : String(vapiResText).slice(0, 1000),
        });

        // Update status to failed
        await supabase
          .from('user_settings')
          .update({ assistant_provisioning_status: 'failed' })
          .eq('id', user_id);

        throw error;
      }
      const vapiData = JSON.parse(vapiResText);
      vapiAssistantId = vapiData.id;
      if (!vapiAssistantId)
        throw new Error('No assistant ID returned from VAPI');
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
      });

      // Update status to failed
      await supabase
        .from('user_settings')
        .update({ assistant_provisioning_status: 'failed' })
        .eq('id', user_id);

      return new Response(
        JSON.stringify({
          error: 'Failed to provision VAPI assistant',
          details: 'An unexpected error occurred',
        }),
        { status: 500 }
      );
    }

    // Update user_settings with vapi_assistant_id
    const { error: updateError, data: updateData } = await supabase
      .from('user_settings')
      .update({
        vapi_assistant_id: vapiAssistantId,
        assistant_provisioning_status: 'completed',
        assistant_provisioning_completed_at: new Date().toISOString(),
      })
      .eq('id', user_id);
    // ...existing code...
    if (updateError) {
      captureException(updateError, {
        function: 'vapi-assistant-provision',
        operation: 'update_user_settings',
        user_id,
        vapi_assistant_id: vapiAssistantId,
      });
      return new Response(
        JSON.stringify({
          error: 'Failed to update user_settings',
          details: 'An unexpected error occurred',
        }),
        { status: 500 }
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
    const error =
      e instanceof Error
        ? e
        : new Error('Unexpected error in vapi-assistant-provision function');
    captureException(error, {
      function: 'vapi-assistant-provision',
      operation: 'main_handler',
    });
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
