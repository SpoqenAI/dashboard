import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

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
        { error: 'No assistant found for user' },
        { status: 404 }
      );
    }

    // Get environment variables
    const vapiApiKey = process.env.VAPI_PRIVATE_KEY;
    const vapiWebhookSecret = process.env.VAPI_WEBHOOK_SECRET;
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;

    if (!vapiApiKey || !vapiWebhookSecret || !appUrl) {
      return NextResponse.json(
        { error: 'Missing required environment variables' },
        { status: 500 }
      );
    }

    // Update the assistant with webhook configuration
    const updateResponse = await fetch(
      `https://api.vapi.ai/assistant/${userAssistantId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vapiApiKey}`,
        },
        body: JSON.stringify({
          server: {
            url: `${appUrl}/api/webhooks/vapi`,
            timeoutSeconds: 20,
          },
          serverMessages: ['end-of-call-report'],
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      logger.error(
        'UPDATE_WEBHOOK',
        'Failed to update assistant webhook configuration',
        new Error(errorText),
        {
          status: updateResponse.status,
          assistantId: userAssistantId,
        }
      );
      return NextResponse.json(
        { error: 'Failed to update assistant webhook configuration' },
        { status: updateResponse.status }
      );
    }

    const updatedAssistant = await updateResponse.json();

    logger.info(
      'UPDATE_WEBHOOK',
      'Assistant webhook configuration updated successfully',
      {
        assistantId: userAssistantId,
        userId: logger.maskUserId(user.id),
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Assistant webhook configuration updated successfully',
      assistantId: userAssistantId,
      webhookUrl: `${appUrl}/api/webhooks/vapi`,
    });
  } catch (error) {
    logger.error(
      'UPDATE_WEBHOOK',
      'Error updating assistant webhook configuration',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
