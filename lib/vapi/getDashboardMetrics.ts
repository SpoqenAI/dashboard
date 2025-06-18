/**
 * 🏷  PROJECT:  Spoqen — “Speaky” Interactive AI Voicemail
 * FILE:       src/lib/vapi/getDashboardMetrics.ts
 *
 * PURPOSE
 * --------
 * Pull raw call records from **Vapi** and aggregate them into the key
 * KPIs shown on the Speaky web dashboard.  These metrics appear on the
 * “📈  Call Overview” card at the top of /dashboard/calls.
 *
 * METRICS WE NEED
 * 1. total            – total # of calls in the date range
 * 2. answered         – calls the AI actually connected and spoke
 * 3. missed           – rings / busy / voicemail (customer never talked)
 * 4. conversionRate   – % of *answered* calls where metadata.converted === true
 * 5. avgDuration      – mean `durationSeconds` across answered calls
 *
 * BUSINESS RULES
 * ---------------
 *   MISSED_CODES = {
 *     "customer-did-not-answer",
 *     "customer-busy",
 *     "voicemail",
 *     "no-routes-available"
 *   }
 *   answered  = status === "completed" && !MISSED_CODES.has(endedReason)
 *   missed    = MISSED_CODES.has(endedReason)
 *   converted = metadata?.converted === true
 *   conversionRate = answered ? converted / answered : 0
 *
 * VAPI REST CONTRACT
 * ------------------
 *   BASE    : https://api.vapi.ai
 *   LIST    : GET /call
 *     query : from=<ISO>    required (inclusive)
 *             to=<ISO>      required (inclusive)
 *             limit=100     optional (default 100)
 *             cursor=<str>  pagination cursor from previous page
 *   AUTH    : Authorization: Bearer ${VAPI_TOKEN}
 *
 *   Response:
 *   {
 *     "data": Call[],
 *     "nextCursor": string | null
 *   }
 *
 *   Call (subset):
 *   {
 *     id: string;
 *     status: "completed" | "failed" | "in_progress" | ...;
 *     endedReason: string;               // see MISSED_CODES
 *     durationSeconds: number;
 *     metadata?: { converted?: boolean };
 *   }
 *
 * IMPLEMENTATION
 * --------------
 * export async function getMetrics(
 *   fromISO: string,
 *   toISO:   string,
 *   token   = process.env.VAPI_TOKEN
 * ): Promise<{
 *   total: number;
 *   answered: number;
 *   missed: number;
 *   conversionRate: number; // 0–1
 *   avgDuration: number;    // seconds
 * }>
 *
 * – Fetch pages until nextCursor === null.
 * – Retry up to 3x on 5xx or network errors (exponential back-off).
 * – No console.log; return typed object only.
 * – Throw descriptive Error on non-200 response.
 *
 * ENV
 * ---
 *   we have the following ENV structure
NEXT_PUBLIC_SUPABASE_URL
VAPI_PRIVATE_KEY
VAPI_PUBLIC_KEY
VAPI_ASSISTANT_ID
VAPI_PHONE_NUMBER_ID
NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * NOTE
 * ----
 * If Vapi adds new `endedReason` codes, MISSED_CODES should be updated
 * in ./constants/vapi.ts (single source of truth).
 */

import { MISSED_CODES } from '@/lib/constants/vapi';
import { logger } from '@/lib/logger';

export interface DashboardMetrics {
  total: number;
  answered: number;
  missed: number;
  conversionRate: number;
  avgDuration: number;
}

interface VapiCall {
  id: string;
  status: string;
  endedReason: string;
  durationSeconds: number;
  metadata?: { converted?: boolean };
}

interface VapiResponse {
  data: VapiCall[];
  nextCursor: string | null;
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  attempts = 3,
  backoff = 500
): Promise<Response> {
  try {
    const res = await fetch(url, options);
    if (!res.ok && res.status >= 500 && attempts > 1) {
      await new Promise(r => setTimeout(r, backoff));
      return fetchWithRetry(url, options, attempts - 1, backoff * 2);
    }
    return res;
  } catch (err) {
    if (attempts > 1) {
      await new Promise(r => setTimeout(r, backoff));
      return fetchWithRetry(url, options, attempts - 1, backoff * 2);
    }
    throw err;
  }
}

export async function getMetrics(
  fromISO: string,
  toISO: string,
  token = process.env.VAPI_PRIVATE_KEY
): Promise<DashboardMetrics> {
  if (!token) {
    throw new Error('VAPI token not configured');
  }

  const baseUrl = process.env.VAPI_API_URL || 'https://api.vapi.ai';
  let cursor: string | null = null;

  let total = 0;
  let answered = 0;
  let missed = 0;
  let conversions = 0;
  let durationSum = 0;

  do {
    const url = new URL('/v1/calls', baseUrl);
    url.searchParams.set('from', fromISO);
    url.searchParams.set('to', toISO);
    url.searchParams.set('limit', '100');
    if (cursor) {
      url.searchParams.set('cursor', cursor);
    }

    const res = await fetchWithRetry(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'User-Agent': 'spoqen-dashboard/1.0',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      throw new Error(
        `Vapi API request failed with ${res.status} ${res.statusText}`
      );
    }

    const json = (await res.json()) as VapiResponse;

    for (const call of json.data) {
      total++;
      const callMissed = MISSED_CODES.has(call.endedReason);
      const callAnswered = call.status === 'completed' && !callMissed;

      if (callAnswered) {
        answered++;
        durationSum += call.durationSeconds ?? 0;
        if (call.metadata?.converted === true) {
          conversions++;
        }
      } else if (callMissed) {
        missed++;
      }
    }

    cursor = json.nextCursor;
  } while (cursor);

  const avgDuration = answered ? durationSum / answered : 0;
  const conversionRate = answered ? conversions / answered : 0;

  logger.info('Metrics', 'Dashboard metrics calculated', {
    fromISO,
    toISO,
    total,
    answered,
    missed,
    conversions,
  });

  return {
    total,
    answered,
    missed,
    conversionRate,
    avgDuration,
  };
}
