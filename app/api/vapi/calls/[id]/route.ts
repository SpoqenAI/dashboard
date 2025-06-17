import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const apiKey = process.env.VAPI_PRIVATE_KEY;
  const baseUrl = process.env.VAPI_API_URL || 'https://api.vapi.ai';

  if (!apiKey) {
    logger.error('VAPI', 'API key not configured');
    return NextResponse.json(
      { error: 'VAPI API key not configured' },
      { status: 500 }
    );
  }

  try {
    const callUrl = new URL(`/v1/calls/${params.id}`, baseUrl);
    const callRes = await fetch(callUrl.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'User-Agent': 'spoqen-dashboard/1.0',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!callRes.ok) {
      logger.error('VAPI', 'Failed to fetch call', undefined, {
        status: callRes.status,
      });
      return NextResponse.json(
        { error: 'Failed to fetch call' },
        { status: callRes.status }
      );
    }

    const callData = await callRes.json();

    const analyticsUrl = new URL(`/v1/analytics`, baseUrl);
    analyticsUrl.searchParams.set('callId', params.id);

    const analyticsRes = await fetch(analyticsUrl.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'User-Agent': 'spoqen-dashboard/1.0',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!analyticsRes.ok) {
      logger.error('VAPI', 'Failed to fetch analytics', undefined, {
        status: analyticsRes.status,
      });
      return NextResponse.json(
        { error: 'Failed to fetch analytics' },
        { status: analyticsRes.status }
      );
    }

    const analyticsData = await analyticsRes.json();

    return NextResponse.json({ call: callData, analytics: analyticsData });
  } catch (error) {
    logger.error('VAPI', 'API request failed', error as Error);
    return NextResponse.json(
      { error: 'Error fetching call details' },
      { status: 500 }
    );
  }
}
