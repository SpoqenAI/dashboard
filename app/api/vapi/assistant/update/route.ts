import { NextRequest, NextResponse } from 'next/server';
import { updateUserAssistant } from '@/lib/vapi-assistant';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// PATCH /api/vapi/assistant/update - Update VAPI assistant properties like firstMessage
export async function PATCH(req: NextRequest) {
  try {
    const { assistantId, firstMessage, voiceId } = await req.json();

    if (!assistantId || !firstMessage) {
      return NextResponse.json(
        { error: 'assistantId and firstMessage are required' },
        { status: 400 }
      );
    }

    // Create authenticated Supabase client
    const supabase = await createClient();

    // Prepare update payload
    const payload: Record<string, any> = {
      firstMessage: firstMessage.trim(),
    };

    if (voiceId) {
      payload.voice = {
        provider: 'deepgram',
        model: 'aura-2',
        voiceId,
      };
    }

    // Use user-scoped function that handles authentication and ownership verification internally
    // Do not accept system prompt edits here; system prompt is managed via settings sync
    // and the developer-only termination policy is appended server-side.
    const result = await updateUserAssistant(supabase, assistantId, payload);

    if (result.error) {
      // Handle different types of errors appropriately
      if (result.error === 'User not authenticated') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (result.error === 'Assistant not found or access denied') {
        return NextResponse.json(
          { error: 'Assistant not found or access denied' },
          { status: 403 }
        );
      }
      if (
        result.error === 'Server misconfiguration – missing VAPI_PRIVATE_KEY'
      ) {
        return NextResponse.json(
          { error: 'Server misconfiguration – missing VAPI_PRIVATE_KEY' },
          { status: 500 }
        );
      }
      if (result.error === 'Failed to update assistant in VAPI') {
        return NextResponse.json(
          { error: 'Failed to update assistant in VAPI' },
          { status: 502 }
        );
      }

      // Generic error fallback
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error(
      'VAPI_UPDATE',
      'Unhandled error',
      err instanceof Error ? err : new Error(String(err))
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
