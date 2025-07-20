import { NextRequest, NextResponse } from 'next/server';
import { getUserAssistantInfo } from '@/lib/vapi-assistant';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// GET /api/vapi/assistant/info – returns the assistant JSON from Vapi for the authenticated user
export async function GET(req: NextRequest) {
  try {
    // Create authenticated Supabase client
    const supabase = await createClient();

    // Use user-scoped function that handles authentication and ownership verification internally
    const result = await getUserAssistantInfo(supabase);

    if (result.error) {
      // Handle different types of errors appropriately
      if (result.error === 'User not authenticated') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (result.error === 'No assistant found for user') {
        return NextResponse.json(
          { error: 'Assistant not found' },
          { status: 404 }
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
      if (result.error === 'Failed to fetch assistant from VAPI') {
        return NextResponse.json(
          { error: 'Failed to fetch assistant' },
          { status: 502 }
        );
      }

      // Generic error fallback
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ assistant: result.data });
  } catch (err) {
    logger.error('VAPI_INFO', 'Unhandled', err as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
