import { NextRequest, NextResponse } from 'next/server';
import { getUserVapiAssistantId } from '@/lib/user-settings';
import {
  updateUserAssistant,
  getStandardAnalysisPlan,
} from '@/lib/vapi-assistant';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// POST /api/vapi/assistant/fix-analysis-plan
// Updates existing assistant with a simplified analysis plan that works
export async function POST(req: NextRequest) {
  try {
    // Create authenticated Supabase client
    const supabase = await createClient();

    // Get user's assistant ID using user-scoped function
    const assistantResult = await getUserVapiAssistantId(supabase);

    if (assistantResult.error) {
      if (assistantResult.error === 'User not authenticated') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.json(
        { error: assistantResult.error },
        { status: 400 }
      );
    }

    const assistantId = assistantResult.data;
    if (!assistantId) {
      return NextResponse.json(
        { error: 'No assistant found for user' },
        { status: 404 }
      );
    }

    // Prepare the analysis plan update using the standard configuration
    const analysisUpdates = {
      analysisPlan: getStandardAnalysisPlan(),
    };

    // Use user-scoped function to update the assistant
    const result = await updateUserAssistant(
      supabase,
      assistantId,
      analysisUpdates
    );

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
          { error: 'Server misconfiguration' },
          { status: 500 }
        );
      }
      if (result.error === 'Failed to update assistant in VAPI') {
        return NextResponse.json(
          { error: 'Failed to fix assistant analysis plan' },
          { status: 502 }
        );
      }

      // Generic error fallback
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error(
      'VAPI_FIX',
      'Unhandled error',
      err instanceof Error ? err : new Error(String(err))
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
