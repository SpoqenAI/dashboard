import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { ActionPoints } from '@/lib/types';
import { ActionPointsExtractor } from '@/lib/services/action-points-extractor';

/**
 * Instantiate the action points extractor service
 */
const actionPointsExtractor = new ActionPointsExtractor();

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

    // Check if call has analysis data for action point extraction
    const hasAnalysis = !!callData.analysis;
    const hasSummary = !!callData.analysis?.summary;
    const hasTranscript = !!callData.transcript;

    logger.debug(
      'VAPI',
      'Preparing to extract action points from VAPI analysis',
      {
        callId: callId,
        hasAnalysis,
        hasSummary,
        hasTranscript,
        summaryLength: callData.analysis?.summary?.length || 0,
        transcriptLength: callData.transcript?.length || 0,
      }
    );

    // Validate that we have some analysis data to work with
    if (!hasAnalysis && !hasTranscript) {
      logger.warn('VAPI', 'No analysis or transcript data available', {
        callId: callId,
        hasAnalysis,
        hasTranscript,
      });

      return NextResponse.json(
        {
          error:
            'Cannot extract action points: no analysis or transcript data available',
          callId: callId,
        },
        { status: 400 }
      );
    }

    // Extract action points using the dedicated service
    const actionPoints = actionPointsExtractor.extract(callData);

    // Validate the response structure
    if (
      !actionPoints ||
      !Array.isArray(actionPoints.keyPoints) ||
      !Array.isArray(actionPoints.followUpItems) ||
      !Array.isArray(actionPoints.urgentConcerns)
    ) {
      logger.error(
        'VAPI',
        'Invalid action points structure from extraction service',
        undefined,
        {
          actionPoints,
          callId: callId,
        }
      );

      return NextResponse.json(
        { error: 'Failed to extract valid action points structure' },
        { status: 500 }
      );
    }

    logger.info('VAPI', 'Action points extracted successfully using service', {
      callId: callId,
      keyPointsCount: actionPoints.keyPoints.length,
      followUpItemsCount: actionPoints.followUpItems.length,
      urgentConcernsCount: actionPoints.urgentConcerns.length,
      sentiment: actionPoints.sentiment,
      callPurpose: actionPoints.callPurpose,
      source: 'vapi-analysis',
    });

    return NextResponse.json({
      actionPoints,
      callId: callId,
      extractedAt: new Date().toISOString(),
      source: 'vapi-analysis',
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    logger.error(
      'VAPI',
      'Error extracting action points with service',
      error instanceof Error ? error : new Error(errorMessage),
      {
        callId: callId,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      }
    );

    // Handle timeout errors specifically
    if (errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
      return NextResponse.json(
        { error: 'Request timeout: VAPI service took too long to respond' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to extract action points from call data' },
      { status: 500 }
    );
  }
}
