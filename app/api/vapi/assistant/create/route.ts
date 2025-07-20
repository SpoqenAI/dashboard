import { NextRequest, NextResponse } from 'next/server';
import { createUserAssistant } from '@/lib/vapi-assistant';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// POST /api/vapi/assistant/create
// Body: { assistantName: string; greeting: string }
export async function POST(req: NextRequest) {
  try {
    const { assistantName, greeting } = await req.json();

    if (!assistantName || !greeting) {
      return NextResponse.json(
        { error: 'assistantName and greeting are required' },
        { status: 400 }
      );
    }

    // Create authenticated Supabase client
    const supabase = await createClient();

    // Use user-scoped function that handles authentication, assistant creation, and user settings update
    const result = await createUserAssistant(supabase, {
      assistantName,
      greeting,
    });

    if (result.error) {
      // Handle different types of errors appropriately
      if (result.error === 'User not authenticated') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (
        result.error ===
        'Server misconfiguration – missing VAPI environment variables'
      ) {
        return NextResponse.json(
          { error: 'Server misconfiguration — missing Vapi env vars' },
          { status: 500 }
        );
      }
      if (result.error === 'Failed to create assistant in VAPI') {
        return NextResponse.json(
          { error: 'Failed to create assistant in Vapi' },
          { status: 502 }
        );
      }

      // Generic error fallback
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ assistantId: result.data!.assistantId });
  } catch (err: any) {
    logger.error(
      'VAPI_CREATE',
      'Unhandled error',
      err instanceof Error ? err : new Error(String(err))
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
