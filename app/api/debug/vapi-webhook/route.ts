import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import { callEventEmitter } from '@/lib/events';

export async function GET(request: NextRequest) {
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

    // Get environment variables
    const vapiWebhookSecret = process.env.VAPI_WEBHOOK_SECRET;
    const vapiPrivateKey = process.env.VAPI_PRIVATE_KEY;
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;

    // Calculate webhook URL
    const webhookUrl = siteUrl
      ? `${siteUrl}/api/webhooks/vapi`
      : 'Not configured';

    // Get SSE connection status
    const activeListeners = callEventEmitter.getListenerCount();

    // Test SSE connection
    let sseTestResult = 'Not tested';
    try {
      const sseResponse = await fetch(`${siteUrl}/api/sse/call-updates`, {
        headers: {
          Cookie: request.headers.get('cookie') || '',
        },
      });
      sseTestResult = sseResponse.ok
        ? 'Connected'
        : `Failed: ${sseResponse.status}`;
    } catch (error) {
      sseTestResult = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      user: {
        id: logger.maskUserId(user.id),
        hasAssistantId: !!userAssistantId,
        assistantId: userAssistantId,
      },
      environment: {
        hasWebhookSecret: !!vapiWebhookSecret,
        hasPrivateKey: !!vapiPrivateKey,
        siteUrl,
        webhookUrl,
        nodeEnv: process.env.NODE_ENV,
      },
      realTimeSystem: {
        activeListeners,
        sseTestResult,
        eventEmitterWorking: activeListeners >= 0,
      },
      instructions: {
        webhookSetup:
          'Ensure this webhook URL is configured in your VAPI assistant settings',
        events:
          'Assistant should be configured to send "end-of-call-report" events',
        sseConnection:
          'SSE connection should show "Connected" for real-time updates',
        troubleshooting: [
          '1. Check VAPI dashboard for correct Server URL and Secret',
          '2. Verify assistant is configured with "end-of-call-report" events',
          '3. Ensure webhook URL is publicly accessible',
          '4. Check browser console for SSE connection errors',
          '5. Verify VAPI_WEBHOOK_SECRET matches the secret in VAPI dashboard',
        ],
      },
    });
  } catch (error) {
    logger.error(
      'VAPI_WEBHOOK_DEBUG',
      'Error in debug endpoint',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      {
        error: 'Debug endpoint failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
