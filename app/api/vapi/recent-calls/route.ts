import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// Type definitions for Vapi API response
interface VapiCallResponse {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  startedAt?: string;
  endedAt?: string;
  type?: string;
  status?: string;
  cost?: number;
  messages?: Array<{
    role: string;
    message: string;
    time?: number;
    endTime?: number;
  }>;
  analysis?: {
    summary?: string;
  };
  destination?: {
    number?: string;
  };
  customer?: {
    name?: string;
    number?: string;
  };
  phoneNumber?: {
    number?: string;
  };
  // Add other fields as needed
  [key: string]: any;
}

// Frontend expected format
interface FrontendCall {
  id: string;
  phoneNumber?: string;
  callerName?: string;
  status: string;
  endedReason: string;
  durationSeconds: number;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  cost?: number;
  transcript?: string;
  summary?: string;
}

function mapVapiCallToFrontend(vapiCall: VapiCallResponse): FrontendCall {
  // Extract phone number from various possible sources
  const phoneNumber =
    vapiCall.customer?.number ||
    vapiCall.destination?.number ||
    vapiCall.phoneNumber?.number;

  // Calculate duration in seconds (if available)
  let durationSeconds = 0;
  if (vapiCall.endedAt && vapiCall.startedAt) {
    const endedDate = new Date(vapiCall.endedAt);
    const startedDate = new Date(vapiCall.startedAt);

    // Check if both dates are valid before calculating duration
    if (!isNaN(endedDate.getTime()) && !isNaN(startedDate.getTime())) {
      durationSeconds = Math.round(
        (endedDate.getTime() - startedDate.getTime()) / 1000
      );
    }
  }

  // Determine status and ended reason
  const status = vapiCall.status || 'unknown';
  const endedReason =
    vapiCall.endedReason ||
    (durationSeconds > 0 ? 'customer-ended-call' : 'no-answer');

  // Extract transcript from messages with validation
  const transcript =
    vapiCall.messages
      ?.filter(
        msg =>
          msg &&
          typeof msg === 'object' &&
          typeof msg.role === 'string' &&
          typeof msg.message === 'string' &&
          msg.role.trim() !== '' &&
          msg.message.trim() !== ''
      )
      ?.map(msg => `${msg.role}: ${msg.message}`)
      .join('\n') || undefined;

  return {
    id: vapiCall.id,
    phoneNumber,
    callerName: vapiCall.customer?.name,
    status,
    endedReason,
    durationSeconds,
    createdAt:
      vapiCall.createdAt || vapiCall.startedAt || new Date().toISOString(),
    startedAt: vapiCall.startedAt,
    endedAt: vapiCall.endedAt,
    cost: vapiCall.cost,
    transcript,
    summary: vapiCall.analysis?.summary,
  };
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.VAPI_PRIVATE_KEY;
  const baseUrl = process.env.VAPI_API_URL || 'https://api.vapi.ai';

  if (!apiKey) {
    logger.error('VAPI', 'API key not configured');
    return NextResponse.json(
      { error: 'VAPI API key not configured' },
      { status: 500 }
    );
  }

  // Fix: Use correct endpoint path - should be /call not /v1/calls
  const url = new URL('/call', baseUrl);
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit');
  if (limit) {
    url.searchParams.set('limit', limit);
  }

  logger.debug('VAPI', 'Making request to Vapi API', {
    url: url.toString(),
    limit,
  });

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'User-Agent': 'spoqen-dashboard/1.0',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      logger.error('VAPI', 'API error', undefined, {
        status: res.status,
        statusText: res.statusText,
        url: url.toString(),
      });
      return NextResponse.json(
        { error: 'Failed to fetch calls from VAPI' },
        { status: res.status }
      );
    }

    const data: VapiCallResponse[] = await res.json();

    // Transform the data to match frontend expectations
    const mappedCalls = Array.isArray(data)
      ? data.map(mapVapiCallToFrontend)
      : [];

    logger.debug('VAPI', 'Successfully fetched and mapped calls', {
      originalCount: Array.isArray(data) ? data.length : 0,
      mappedCount: mappedCalls.length,
    });

    // Return in the format expected by the dashboard
    return NextResponse.json({ calls: mappedCalls });
  } catch (error) {
    logger.error('VAPI', 'API request failed', error as Error);
    return NextResponse.json(
      { error: 'Error fetching calls from VAPI' },
      { status: 500 }
    );
  }
}
