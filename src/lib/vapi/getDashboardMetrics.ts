import { MISSED_CODES } from '../../../lib/constants/vapi';
import { retry } from '../../../lib/utils';

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

/**
 * Processes analytics API response and extracts dashboard metrics
 * @param results - Array of analytics query results
 * @returns DashboardMetrics object with calculated values
 */
function processAnalyticsResponse(results: any[]): DashboardMetrics {
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

  // Perform the API request with retry logic
  const fetchAnalyticsData = async (): Promise<Response> => {
    const response = await fetch(url.toString(), {
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

    if (!response.ok) {
      // For server errors (5xx), allow retries; for client errors (4xx), fail immediately
      if (response.status >= 500) {
        throw new Error(
          `Server error: ${response.status} ${response.statusText}`
        );
      } else {
        throw new Error(
          `Vapi Analytics API returned status ${response.status}`
        );
      }
    }

    return response;
  };

  const response = await retry(fetchAnalyticsData);
  const results = await response.json();

  // Process the analytics response and return dashboard metrics
  return processAnalyticsResponse(results);
}
