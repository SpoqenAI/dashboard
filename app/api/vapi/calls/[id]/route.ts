import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  
  // Validate call ID parameter
  if (!resolvedParams.id || typeof resolvedParams.id !== 'string') {
    logger.warn('VAPI', 'Invalid call ID: missing or not a string', {
      providedId: resolvedParams.id,
    });
    return NextResponse.json(
      { error: 'Call ID is required and must be a string' },
      { status: 400 }
    );
  }

  const callId = resolvedParams.id.trim();
  
  if (callId.length === 0) {
    logger.warn('VAPI', 'Invalid call ID: empty string');
    return NextResponse.json(
      { error: 'Call ID cannot be empty' },
      { status: 400 }
    );
  }

  // Validate call ID format (should be alphanumeric with hyphens, typical for UUIDs)
  const callIdPattern = /^[a-zA-Z0-9\-_]+$/;
  if (!callIdPattern.test(callId)) {
    logger.warn('VAPI', 'Invalid call ID format', {
      callId: callId,
      pattern: callIdPattern.source,
    });
    return NextResponse.json(
      { error: 'Call ID contains invalid characters' },
      { status: 400 }
    );
  }

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
    const callUrl = new URL(`/call/${callId}`, baseUrl);

    logger.debug('VAPI', 'Fetching call details', {
      callId: callId,
      url: callUrl.toString(),
    });

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
        statusText: callRes.statusText,
        callId: callId,
        url: callUrl.toString(),
      });
      return NextResponse.json(
        { error: 'Failed to fetch call' },
        { status: callRes.status }
      );
    }

    const callData = await callRes.json();

    logger.debug('VAPI', 'Successfully fetched call details', {
      callId: callId,
      hasData: !!callData,
    });

    return NextResponse.json({ call: callData });
  } catch (error) {
    logger.error('VAPI', 'API request failed', error as Error, {
      callId: callId,
    });
    return NextResponse.json(
      { error: 'Error fetching call details' },
      { status: 500 }
    );
  }
}
