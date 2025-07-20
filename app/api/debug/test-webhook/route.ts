import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import { callEventEmitter } from '@/lib/events';
import { callCache } from '@/lib/call-cache';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's assistant ID
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('vapi_assistant_id')
      .eq('id', user.id)
      .single();

    const userAssistantId = userSettings?.vapi_assistant_id;

    if (!userAssistantId) {
      return NextResponse.json(
        { error: 'No assistant configured for user' },
        { status: 400 }
      );
    }

    // Create a test webhook event
    const testCallId = `test-${Date.now()}`;
    const testEvent: import('@/lib/events').CallUpdateEvent = {
      type: 'new-call',
      callId: testCallId,
      userId: user.id,
      timestamp: new Date().toISOString(),
      callData: {
        id: testCallId,
        summary: 'Test call summary - this is a manual test',
        analysis: {
          summary: 'Test call analysis',
          structuredData: {
            sentiment: 'positive',
            leadQuality: 'warm',
            callPurpose: 'Test call',
            keyPoints: ['This is a test call for debugging'],
          },
        },
        endedReason: 'hangup',
        transcript:
          'AI: Hello! User: This is a test call. AI: Thank you for testing!',
        recordingUrl: undefined,
        phoneNumber: '+1234567890',
        callerName: 'Test Caller',
        createdAt: new Date().toISOString(),
        startedAt: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
        endedAt: new Date().toISOString(),
        cost: 0.05,
        durationSeconds: 60,
      },
    };

    // Clear cache and emit event
    callCache.clear();
    callEventEmitter.emit(user.id, testEvent);

    logger.info('TEST_WEBHOOK', 'Test webhook event emitted', {
      callId: testCallId,
      userId: logger.maskUserId(user.id),
      activeListeners: callEventEmitter.getListenerCount(),
    });

    return NextResponse.json({
      success: true,
      message: 'Test webhook event emitted',
      testCallId,
      activeListeners: callEventEmitter.getListenerCount(),
      instructions: [
        'Check your dashboard for the test call',
        'Look for real-time notification',
        'Verify SSE connection is working',
        'Check browser console for any errors',
      ],
    });
  } catch (error) {
    logger.error(
      'TEST_WEBHOOK',
      'Error in test webhook endpoint',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      {
        error: 'Test webhook failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
