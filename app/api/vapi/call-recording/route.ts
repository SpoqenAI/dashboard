import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const apiKey = process.env.VAPI_PRIVATE_KEY;
  const baseUrl = process.env.VAPI_API_URL || 'https://api.vapi.ai';

  if (!apiKey) {
    logger.error('CALL_RECORDING', 'API key not configured');
    return NextResponse.json(
      { error: 'VAPI API key not configured' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const callId = searchParams.get('callId');

  if (!callId) {
    return NextResponse.json({ error: 'Call ID is required' }, { status: 400 });
  }

  try {
    // Get authenticated user and their assistant ID for security
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user's VAPI assistant ID from user_settings
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('vapi_assistant_id')
      .eq('id', user.id)
      .single();

    const userAssistantId = userSettings?.vapi_assistant_id;

    if (!userAssistantId) {
      return NextResponse.json(
        { error: 'No assistant configured for user' },
        { status: 403 }
      );
    }

    // Fetch call details from VAPI to verify ownership and get recording URL
    const url = new URL(`/call/${callId}`, baseUrl);

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'User-Agent': 'spoqen-dashboard/1.0',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      logger.error('CALL_RECORDING', 'VAPI API error', undefined, {
        status: res.status,
        statusText: res.statusText,
        callId,
      });
      return NextResponse.json(
        { error: 'Failed to fetch call details' },
        { status: res.status }
      );
    }

    const callData = await res.json();

    // Verify the call belongs to the user's assistant
    if (callData.assistantId !== userAssistantId) {
      logger.warn('CALL_RECORDING', 'Unauthorized access attempt', {
        callId,
        userId: user.id,
        callAssistantId: callData.assistantId,
        userAssistantId,
      });
      return NextResponse.json(
        { error: 'Unauthorized access to call' },
        { status: 403 }
      );
    }

    // Return the recording URL if available
    if (callData.recordingUrl) {
      logger.info('CALL_RECORDING', 'Recording URL retrieved', {
        callId,
        userId: user.id,
        hasRecording: true,
      });
      return NextResponse.json({
        recordingUrl: callData.recordingUrl,
        callId: callData.id,
      });
    } else {
      logger.info('CALL_RECORDING', 'No recording available', {
        callId,
        userId: user.id,
        hasRecording: false,
      });
      return NextResponse.json({
        recordingUrl: null,
        callId: callData.id,
        message: 'No recording available for this call',
      });
    }
  } catch (error) {
    logger.error(
      'CALL_RECORDING',
      'Error fetching call recording',
      error instanceof Error ? error : new Error(String(error)),
      { callId }
    );
    return NextResponse.json(
      { error: 'Failed to fetch call recording' },
      { status: 500 }
    );
  }
}
