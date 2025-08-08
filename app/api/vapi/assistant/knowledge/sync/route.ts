import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getUserAssistantInfo,
  updateUserAssistant,
  validateAssistantId,
} from '@/lib/vapi-assistant';
import { logger } from '@/lib/logger';

// POST /api/vapi/assistant/knowledge/sync
// Body: { assistantId: string, fileIds: string[] }
// Ensures a single Query Tool exists with provided fileIds and attaches it to the assistant
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const apiKey = process.env.VAPI_PRIVATE_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Server misconfiguration – missing VAPI_PRIVATE_KEY' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const assistantId: string = body?.assistantId;
    const fileIds: string[] = Array.isArray(body?.fileIds) ? body.fileIds : [];

    if (!assistantId || !validateAssistantId(assistantId)) {
      return NextResponse.json(
        { error: 'Invalid assistantId' },
        { status: 400 }
      );
    }

    // Fetch assistant and verify ownership through user-scoped helper
    const assistantResult = await getUserAssistantInfo(supabase as any);
    if (assistantResult.error || !assistantResult.data) {
      return NextResponse.json(
        { error: assistantResult.error || 'Assistant not found' },
        { status: 400 }
      );
    }
    const assistant = assistantResult.data;
    if (assistant.id !== assistantId) {
      return NextResponse.json(
        { error: 'Assistant not found' },
        { status: 404 }
      );
    }

    // Create or update the Query Tool using the documented schema
    let toolId: string | undefined = assistant?.metadata?.knowledgeToolId;

    const knowledgeBase = {
      provider: 'google',
      name: `kb-${assistantId}`,
      description: 'User uploaded files for this assistant',
      fileIds,
    };

    if (!toolId) {
      const createRes = await fetch('https://api.vapi.ai/tool', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          type: 'query',
          function: { name: 'knowledge_query' },
          knowledgeBases: [knowledgeBase],
        }),
      });
      const text = await createRes.text();
      if (!createRes.ok) {
        logger.error(
          'VAPI_KNOWLEDGE',
          'Failed to create query tool',
          new Error(text),
          {
            status: createRes.status,
          }
        );
        return NextResponse.json(
          { error: text || 'Failed to create query tool' },
          { status: 400 }
        );
      }
      const json = JSON.parse(text);
      toolId = json.id;
    } else {
      const patchRes = await fetch(`https://api.vapi.ai/tool/${toolId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          knowledgeBases: [knowledgeBase],
        }),
      });
      if (!patchRes.ok) {
        const text = await patchRes.text();
        logger.error(
          'VAPI_KNOWLEDGE',
          'Failed to update query tool',
          new Error(text),
          {
            status: patchRes.status,
            toolId,
          }
        );
        return NextResponse.json(
          { error: text || 'Failed to update query tool' },
          { status: 400 }
        );
      }
    }

    // Attach tool to assistant by updating the model.toolIds (must send entire model object)
    const existingModel = assistant.model || {};
    const existingToolIds: string[] = Array.isArray(existingModel.toolIds)
      ? existingModel.toolIds
      : [];
    const mergedToolIds = Array.from(new Set([...existingToolIds, toolId!]));

    const modelPatch = {
      ...existingModel,
      toolIds: mergedToolIds,
    };

    const result = await updateUserAssistant(supabase as any, assistantId, {
      model: modelPatch,
      metadata: {
        ...(assistant.metadata || {}),
        knowledgeToolId: toolId,
        fileIds,
      },
    });
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ toolId, fileIds });
  } catch (error) {
    logger.error(
      'VAPI_KNOWLEDGE',
      'Failed to sync assistant knowledge',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: 'Failed to sync assistant knowledge' },
      { status: 500 }
    );
  }
}
