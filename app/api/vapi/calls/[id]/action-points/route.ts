import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { ActionPoints } from '@/lib/types';

/**
 * Extracts action points from VAPI's call analysis data
 * Uses the existing summary and analysis from VAPI instead of external AI services
 */
function extractActionPointsFromVapi(callData: any): ActionPoints {
  const analysis = callData.analysis;
  const summary = analysis?.summary || '';
  const transcript = callData.transcript || '';
  
  // Simple extraction based on VAPI's analysis
  const keyPoints: string[] = [];
  const followUpItems: string[] = [];
  const urgentConcerns: string[] = [];
  
  // If there's a summary, use it as the primary key point
  if (summary && summary.trim().length > 0) {
    keyPoints.push(summary.trim());
  }
  
  // Look for structured data in VAPI's analysis
  if (analysis?.structuredData) {
    const structured = analysis.structuredData;
    
    // Extract any action items or follow-ups from structured data
    if (structured.actionItems) {
      followUpItems.push(...(Array.isArray(structured.actionItems) ? structured.actionItems : [structured.actionItems]));
    }
    
    if (structured.followUps) {
      followUpItems.push(...(Array.isArray(structured.followUps) ? structured.followUps : [structured.followUps]));
    }
    
    if (structured.urgentItems) {
      urgentConcerns.push(...(Array.isArray(structured.urgentItems) ? structured.urgentItems : [structured.urgentItems]));
    }
    
    if (structured.keyPoints) {
      keyPoints.push(...(Array.isArray(structured.keyPoints) ? structured.keyPoints : [structured.keyPoints]));
    }
  }
  
  // Determine call purpose from VAPI data
  let callPurpose = 'General inquiry';
  if (analysis?.purpose) {
    callPurpose = analysis.purpose;
  } else if (callData.metadata?.purpose) {
    callPurpose = callData.metadata.purpose;
  } else if (summary && summary.length > 0) {
    // Extract purpose from summary if available
    const purposeMatch = summary.match(/(?:purpose|reason|regarding|about):\s*([^.]+)/i);
    if (purposeMatch) {
      callPurpose = purposeMatch[1].trim();
    }
  }
  
  // Determine sentiment from VAPI analysis
  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
  if (analysis?.sentiment) {
    sentiment = analysis.sentiment.toLowerCase();
  } else if (analysis?.successEvaluation) {
    // If VAPI has success evaluation, use that to determine sentiment
    const success = analysis.successEvaluation.toLowerCase();
    if (success.includes('success') || success.includes('positive')) {
      sentiment = 'positive';
    } else if (success.includes('fail') || success.includes('negative')) {
      sentiment = 'negative';
    }
  }
  
  return {
    keyPoints: keyPoints.filter(point => point && point.trim().length > 0),
    followUpItems: followUpItems.filter(item => item && item.trim().length > 0),
    urgentConcerns: urgentConcerns.filter(concern => concern && concern.trim().length > 0),
    sentiment,
    callPurpose,
  };
}

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

    logger.debug('VAPI', 'Preparing to extract action points from VAPI analysis', {
      callId: callId,
      hasAnalysis,
      hasSummary,
      hasTranscript,
      summaryLength: callData.analysis?.summary?.length || 0,
      transcriptLength: callData.transcript?.length || 0,
    });

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

    // Extract action points using VAPI's native analysis
    const actionPoints = extractActionPointsFromVapi(callData);

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
      'Successfully extracted action points from VAPI analysis',
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
      'Failed to extract action points from VAPI analysis',
      error as Error
    );
    return NextResponse.json(
      { error: 'Error extracting action points from VAPI analysis' },
      { status: 500 }
    );
  }
}
