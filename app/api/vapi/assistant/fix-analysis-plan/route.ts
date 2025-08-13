import { NextRequest, NextResponse } from 'next/server';
import { getUserVapiAssistantId } from '@/lib/user-settings';
import {
  updateUserAssistant,
  getStandardAnalysisPlan,
  getAnalysisPlanVersion,
  getUserAssistantInfo,
} from '@/lib/vapi-assistant';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import defaults from '@/supabase/functions/_shared/vapi-assistant.defaults.json';

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
    // Preserve existing metadata and set analysisPlanVersion for traceability
    const assistantInfo = await getUserAssistantInfo(supabase);
    const existingMetadata = assistantInfo.data?.metadata || {};

    // Merge a conservative termination policy into existing system message if missing
    const updatedMessages = assistantInfo.data?.model?.messages || [];
    try {
      const {
        ensureTerminationPolicyAppended,
        TERMINATION_DISPLAY_NAME_FALLBACK,
      } = await import('@/lib/vapi/termination-policy');
      const sysIdx = updatedMessages.findIndex(
        (m: any) => m?.role === 'system'
      );
      if (sysIdx >= 0) {
        const sys = updatedMessages[sysIdx];
        const content =
          typeof sys.content === 'string'
            ? sys.content
            : String(sys.content ?? '');
        updatedMessages[sysIdx] = {
          ...sys,
          content: ensureTerminationPolicyAppended(
            content,
            TERMINATION_DISPLAY_NAME_FALLBACK
          ),
        };
      }
    } catch {
      // best-effort
    }

    const modelDefaults = (defaults as any)?.model || {};
    const modelOverrides = {
      ...(typeof modelDefaults.provider === 'string'
        ? { provider: modelDefaults.provider }
        : {}),
      ...(typeof modelDefaults.model === 'string'
        ? { model: modelDefaults.model }
        : {}),
      ...(typeof modelDefaults.temperature === 'number'
        ? { temperature: modelDefaults.temperature }
        : {}),
      ...(typeof modelDefaults.maxTokens === 'number'
        ? { maxTokens: modelDefaults.maxTokens }
        : {}),
    } as Record<string, unknown>;

    const analysisUpdates = {
      analysisPlan: getStandardAnalysisPlan(),
      metadata: {
        ...existingMetadata,
        analysisPlanVersion: getAnalysisPlanVersion(),
      },
      model: {
        ...(assistantInfo.data?.model ? assistantInfo.data.model : {}),
        ...modelOverrides,
        messages: updatedMessages,
        tools: Array.isArray(assistantInfo.data?.model?.tools)
          ? (() => {
              const tools = [...(assistantInfo.data.model.tools as any[])];
              const hasEndCall = tools.some(t => t?.type === 'endCall');
              return hasEndCall ? tools : [{ type: 'endCall' }, ...tools];
            })()
          : [{ type: 'endCall' }],
      },
    } as any;

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
