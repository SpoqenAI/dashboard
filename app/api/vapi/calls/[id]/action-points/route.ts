import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { extractActionPoints } from '@/lib/ai-service';

export async function POST(
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
    // First, fetch the call details from VAPI
    const callUrl = new URL(`/call/${params.id}`, baseUrl);

    logger.debug('VAPI', 'Fetching call for action points generation', {
      callId: params.id,
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
      logger.error('VAPI', 'Failed to fetch call for action points', undefined, {
        status: callRes.status,
        statusText: callRes.statusText,
        callId: params.id,
      });
      return NextResponse.json(
        { error: 'Failed to fetch call details' },
        { status: callRes.status }
      );
    }

    const callData = await callRes.json();

    // Extract transcript and summary from the call data
    const transcript = callData.messages?.map((msg: any) => 
      `${msg.role}: ${msg.message}`
    ).join('\n');
    const summary = callData.analysis?.summary;

    logger.debug('VAPI', 'Generating action points', {
      callId: params.id,
      hasTranscript: !!transcript,
      hasSummary: !!summary,
      transcriptLength: transcript?.length || 0,
    });

    // Generate action points using AI
    const actionPoints = await extractActionPoints(transcript, summary);

    logger.debug('VAPI', 'Successfully generated action points', {
      callId: params.id,
      keyPointsCount: actionPoints.keyPoints.length,
      followUpItemsCount: actionPoints.followUpItems.length,
      urgentConcernsCount: actionPoints.urgentConcerns.length,
    });

    return NextResponse.json({
      callId: params.id,
      actionPoints,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('VAPI', 'Failed to generate action points', error as Error);
    return NextResponse.json(
      { error: 'Error generating action points' },
      { status: 500 }
    );
  }
}