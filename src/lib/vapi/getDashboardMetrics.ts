import { MISSED_CODES } from '@/constants/vapi';

export interface DashboardMetrics {
  total: number;
  answered: number;
  missed: number;
  conversionRate: number; // 0-1
  avgDuration: number; // seconds
}

interface VapiCall {
  status: string;
  endedReason?: string;
  durationSeconds?: number;
  metadata?: { converted?: boolean };
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function getMetrics(
  fromISO: string,
  toISO: string,
  token = process.env.VAPI_PRIVATE_KEY
): Promise<DashboardMetrics> {
  if (!token) {
    throw new Error('VAPI token not provided');
  }

  const baseUrl = process.env.VAPI_API_URL || 'https://api.vapi.ai';

  let cursor: string | null = null;
  let answered = 0;
  let missed = 0;
  let converted = 0;
  let durationTotal = 0;
  let total = 0;

  do {
    const url = new URL('/v1/calls', baseUrl);
    url.searchParams.set('from', fromISO);
    url.searchParams.set('to', toISO);
    url.searchParams.set('limit', '100');
    if (cursor) {
      url.searchParams.set('cursor', cursor);
    }

    let res: Response;
    let attempts = 0;
    while (true) {
      try {
        res = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'User-Agent': 'spoqen-dashboard/1.0',
          },
          signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) {
          if (res.status >= 500 && attempts < 2) {
            await delay(500 * 2 ** attempts);
            attempts += 1;
            continue;
          }
          throw new Error(`Vapi API returned status ${res.status}`);
        }
        break;
      } catch (err) {
        if (attempts < 2) {
          await delay(500 * 2 ** attempts);
          attempts += 1;
          continue;
        }
        throw err instanceof Error ? err : new Error('Failed to fetch Vapi');
      }
    }

    const json = await res.json();
    const calls: VapiCall[] = Array.isArray(json.data) ? json.data : [];
    cursor = json.nextCursor ?? null;

    for (const call of calls) {
      total += 1;
      const isAnswered =
        call.status === 'completed' &&
        !MISSED_CODES.has(call.endedReason ?? '');
      const isMissed = MISSED_CODES.has(call.endedReason ?? '');

      if (isAnswered) {
        answered += 1;
        durationTotal += call.durationSeconds ?? 0;
        if (call.metadata?.converted === true) {
          converted += 1;
        }
      } else if (isMissed) {
        missed += 1;
      }
    }
  } while (cursor);

  return {
    total,
    answered,
    missed,
    conversionRate: answered ? converted / answered : 0,
    avgDuration: answered ? durationTotal / answered : 0,
  };
}
