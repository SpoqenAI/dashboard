import { MISSED_CODES } from '../../../lib/constants/vapi';

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
  const url = new URL('/analytics', baseUrl);

  // Build analytics queries for dashboard metrics
  const queries = [
    {
      table: 'call',
      name: 'total_calls',
      operations: [
        {
          operation: 'count',
          column: 'id',
        },
      ],
      timeRange: {
        start: fromISO,
        end: toISO,
        step: 'day',
        timezone: 'UTC',
      },
    },
    {
      table: 'call',
      name: 'answered_calls',
      operations: [
        {
          operation: 'count',
          column: 'id',
        },
      ],
      timeRange: {
        start: fromISO,
        end: toISO,
        step: 'day',
        timezone: 'UTC',
      },
      filters: [
        {
          column: 'status',
          operator: 'eq',
          value: 'completed',
        },
        {
          column: 'endedReason',
          operator: 'not_in',
          value: Array.from(MISSED_CODES),
        },
      ],
    },
    {
      table: 'call',
      name: 'missed_calls',
      operations: [
        {
          operation: 'count',
          column: 'id',
        },
      ],
      timeRange: {
        start: fromISO,
        end: toISO,
        step: 'day',
        timezone: 'UTC',
      },
      filters: [
        {
          column: 'endedReason',
          operator: 'in',
          value: Array.from(MISSED_CODES),
        },
      ],
    },
    {
      table: 'call',
      name: 'total_duration',
      operations: [
        {
          operation: 'sum',
          column: 'durationSeconds',
        },
      ],
      timeRange: {
        start: fromISO,
        end: toISO,
        step: 'day',
        timezone: 'UTC',
      },
      filters: [
        {
          column: 'status',
          operator: 'eq',
          value: 'completed',
        },
        {
          column: 'endedReason',
          operator: 'not_in',
          value: Array.from(MISSED_CODES),
        },
      ],
    },
  ];

  let res: Response;
  let attempts = 0;
  while (true) {
    try {
      res = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'spoqen-dashboard/1.0',
        },
        body: JSON.stringify({ queries }),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        if (res.status >= 500 && attempts < 2) {
          await delay(500 * 2 ** attempts);
          attempts += 1;
          continue;
        }
        throw new Error(`Vapi Analytics API returned status ${res.status}`);
      }
      break;
    } catch (err) {
      if (attempts < 2) {
        await delay(500 * 2 ** attempts);
        attempts += 1;
        continue;
      }
      throw err instanceof Error
        ? err
        : new Error('Failed to fetch Vapi Analytics');
    }
  }

  const results = await res.json();

  // Parse results from analytics API
  let total = 0;
  let answered = 0;
  let missed = 0;
  let totalDuration = 0;

  for (const result of results) {
    if (result.name === 'total_calls') {
      total = result.result.reduce(
        (sum: number, item: any) => sum + (item.count_id || 0),
        0
      );
    } else if (result.name === 'answered_calls') {
      answered = result.result.reduce(
        (sum: number, item: any) => sum + (item.count_id || 0),
        0
      );
    } else if (result.name === 'missed_calls') {
      missed = result.result.reduce(
        (sum: number, item: any) => sum + (item.count_id || 0),
        0
      );
    } else if (result.name === 'total_duration') {
      totalDuration = result.result.reduce(
        (sum: number, item: any) => sum + (item.sum_durationSeconds || 0),
        0
      );
    }
  }

  // Calculate weighted average duration
  const avgDuration = answered > 0 ? totalDuration / answered : 0;

  return {
    total,
    answered,
    missed,
    conversionRate: 0, // For now, we'll set conversion rate to 0 since we need metadata support
    avgDuration,
  };
}
