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
  data?: VapiCall[];
  nextCursor?: string | null;
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
  const url = new URL('/analytics', baseUrl);

  // Build analytics queries for dashboard metrics
  const queries = [
    {
      table: 'call',
      name: 'total_calls',
      operations: [
        {
          operation: 'count',
          column: 'id'
        }
      ],
      timeRange: {
        start: fromISO,
        end: toISO,
        step: 'day',
        timezone: 'UTC'
      }
    },
    {
      table: 'call',
      name: 'answered_calls',
      operations: [
        {
          operation: 'count',
          column: 'id'
        }
      ],
      timeRange: {
        start: fromISO,
        end: toISO,
        step: 'day',
        timezone: 'UTC'
      },
      filters: [
        {
          column: 'status',
          operator: 'eq',
          value: 'completed'
        },
        {
          column: 'endedReason',
          operator: 'not_in',
          value: Array.from(MISSED_CODES)
        }
      ]
    },
    {
      table: 'call',
      name: 'missed_calls',
      operations: [
        {
          operation: 'count',
          column: 'id'
        }
      ],
      timeRange: {
        start: fromISO,
        end: toISO,
        step: 'day',
        timezone: 'UTC'
      },
      filters: [
        {
          column: 'endedReason',
          operator: 'in',
          value: Array.from(MISSED_CODES)
        }
      ]
    },
    {
      table: 'call',
      name: 'avg_duration',
      operations: [
        {
          operation: 'avg',
          column: 'durationSeconds'
        }
      ],
      timeRange: {
        start: fromISO,
        end: toISO,
        step: 'day',
        timezone: 'UTC'
      },
      filters: [
        {
          column: 'status',
          operator: 'eq',
          value: 'completed'
        },
        {
          column: 'endedReason',
          operator: 'not_in',
          value: Array.from(MISSED_CODES)
        }
      ]
    }
  ];

  const res = await fetchWithRetry(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'spoqen-dashboard/1.0',
    },
    body: JSON.stringify({ queries }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(
      `Vapi Analytics API request failed with ${res.status} ${res.statusText}`
    );
  }

  const results = await res.json();
  
  // Parse results from analytics API
  let total = 0;
  let answered = 0;
  let missed = 0;
  let avgDuration = 0;

  for (const result of results) {
    if (result.name === 'total_calls') {
      total = result.result.reduce((sum: number, item: any) => sum + (item.count_id || 0), 0);
    } else if (result.name === 'answered_calls') {
      answered = result.result.reduce((sum: number, item: any) => sum + (item.count_id || 0), 0);
    } else if (result.name === 'missed_calls') {
      missed = result.result.reduce((sum: number, item: any) => sum + (item.count_id || 0), 0);
    } else if (result.name === 'avg_duration') {
      const durations = result.result.map((item: any) => item.avg_durationSeconds || 0);
      avgDuration = durations.length > 0 ? durations.reduce((sum: number, val: number) => sum + val, 0) / durations.length : 0;
    }
  }

  // For now, we'll set conversion rate to 0 since we need metadata support
  const conversionRate = 0;

  logger.info('Metrics', 'Dashboard metrics calculated via Analytics API', {
    fromISO,
    toISO,
    total,
    answered,
    missed,
    avgDuration,
  });

  return {
    total,
    answered,
    missed,
    conversionRate,
    avgDuration,
  };
}
