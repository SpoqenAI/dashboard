import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { ActionPoints } from '@/lib/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;

  // Validate call ID parameter
  const callId = resolvedParams.id;

  // Check if call ID exists and is a string
  if (!callId || typeof callId !== 'string') {
    logger.warn('VAPI', 'Invalid call ID: missing or not a string', {
      providedId: callId,
      type: typeof callId,
    });
    return NextResponse.json(
      { error: 'Invalid call ID: must be a non-empty string' },
      { status: 400 }
    );
  }

  // Check if call ID is not empty and has reasonable length
  if (callId.trim().length === 0) {
    logger.warn('VAPI', 'Invalid call ID: empty string');
    return NextResponse.json(
      { error: 'Invalid call ID: cannot be empty' },
      { status: 400 }
    );
  }

  if (callId.length < 8 || callId.length > 128) {
    logger.warn('VAPI', 'Invalid call ID: length out of bounds', {
      callId,
      length: callId.length,
    });
    return NextResponse.json(
      { error: 'Invalid call ID: length must be between 8 and 128 characters' },
      { status: 400 }
    );
  }

  // Check if call ID matches expected format (alphanumeric, hyphens, underscores)
  const validIdPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validIdPattern.test(callId)) {
    logger.warn('VAPI', 'Invalid call ID: contains invalid characters', {
      callId,
      allowedPattern: 'alphanumeric characters, hyphens, and underscores only',
    });
    return NextResponse.json(
      {
        error:
          'Invalid call ID: must contain only alphanumeric characters, hyphens, and underscores',
      },
      { status: 400 }
    );
  }

  // Log successful validation for security monitoring
  logger.debug('VAPI', 'Call ID validation passed', {
    callId,
    length: callId.length,
  });

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
    // Fetch the call details from VAPI
    const callUrl = new URL(`/call/${callId}`, baseUrl);

    logger.debug('VAPI', 'Fetching call for action points extraction', {
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
      logger.error(
        'VAPI',
        'Failed to fetch call for action points',
        undefined,
        {
          status: callRes.status,
          statusText: callRes.statusText,
          callId: callId,
        }
      );
      return NextResponse.json(
        { error: 'Failed to fetch call details' },
        { status: callRes.status }
      );
    }

    const callData = await callRes.json();

    // Extract action points from Vapi's analysis.structuredData
    const structuredData = callData.analysis?.structuredData;
    const summary = callData.analysis?.summary;

    logger.debug('VAPI', 'Extracting action points from Vapi analysis', {
      callId: callId,
      hasStructuredData: !!structuredData,
      hasSummary: !!summary,
    });

    // Create action points from Vapi's analysis or provide fallback
    const actionPoints: ActionPoints = {
      callPurpose: structuredData?.callPurpose || 'Analysis not available',
      sentiment: structuredData?.sentiment || 'neutral',
      keyPoints: structuredData?.keyPoints || (summary ? [summary] : []),
      followUpItems: structuredData?.followUpItems || [],
      urgentConcerns: structuredData?.urgentConcerns || [],
    };

    // Validate the response structure
    if (!Array.isArray(actionPoints.keyPoints)) {
      actionPoints.keyPoints = [];
    }
    if (!Array.isArray(actionPoints.followUpItems)) {
      actionPoints.followUpItems = [];
    }
    if (!Array.isArray(actionPoints.urgentConcerns)) {
      actionPoints.urgentConcerns = [];
    }
    if (!['positive', 'neutral', 'negative'].includes(actionPoints.sentiment)) {
      actionPoints.sentiment = 'neutral';
    }

    logger.debug(
      'VAPI',
      'Successfully extracted action points from Vapi analysis',
      {
        callId: callId,
        keyPointsCount: actionPoints.keyPoints.length,
        followUpItemsCount: actionPoints.followUpItems.length,
        urgentConcernsCount: actionPoints.urgentConcerns.length,
        sentiment: actionPoints.sentiment,
        callPurpose: actionPoints.callPurpose,
      }
    );

    return NextResponse.json({
      callId: callId,
      actionPoints,
      generatedAt: new Date().toISOString(),
      source: 'vapi-analysis',
    });
  } catch (error) {
    logger.error(
      'VAPI',
      'Failed to extract action points from Vapi analysis',
      error as Error
    );
    return NextResponse.json(
      { error: 'Error extracting action points' },
      { status: 500 }
    );
  }
}
