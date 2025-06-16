import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const apiKey = process.env.VAPI_API_KEY;
  const baseUrl = process.env.VAPI_API_URL || 'https://api.vapi.ai';

  if (!apiKey) {
    logger.error('VAPI', 'API key not configured');
    return NextResponse.json(
      { error: 'VAPI API key not configured' },
      { status: 500 }
    );
  }

  const url = new URL('/v1/calls', baseUrl);
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit');
  if (limit) {
    url.searchParams.set('limit', limit);
  }

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
      });
      return NextResponse.json(
        { error: 'Failed to fetch calls from VAPI' },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error('VAPI', 'API request failed', error as Error);
    return NextResponse.json(
      { error: 'Error fetching calls from VAPI' },
      { status: 500 }
    );
  }
}
