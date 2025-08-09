import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getUserAssistantInfo,
  updateUserAssistant,
  validateAssistantId,
} from '@/lib/vapi-assistant';
import { logger } from '@/lib/logger';

// POST /api/vapi/assistant/knowledge/detach
// Body: { assistantId: string, fileId: string }
// Removes a fileId from the assistant's knowledge. If none remain, detaches the tool.
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
    const fileId: string = body?.fileId;

    if (!assistantId || !validateAssistantId(assistantId) || !fileId) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

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

    const metadata = assistant.metadata || {};
    const knowledgeToolId: string | undefined = metadata.knowledgeToolId;
    const currentFileIds: string[] = Array.isArray(metadata.fileIds)
      ? metadata.fileIds
      : [];

    // Validate that the requested fileId is actually linked to this assistant
    if (!currentFileIds.includes(fileId)) {
      return NextResponse.json(
        { error: 'File is not attached to this assistant' },
        { status: 400 }
      );
    }
    const nextFileIds = currentFileIds.filter((id: string) => id !== fileId);

    // Update the Query Tool using the documented schema
    if (knowledgeToolId) {
      const knowledgeBase = {
        provider: 'google',
        name: `kb-${assistantId}`,
        description: 'User uploaded files for this assistant',
        fileIds: nextFileIds,
      };
      const res = await fetch(`https://api.vapi.ai/tool/${knowledgeToolId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ knowledgeBases: [knowledgeBase] }),
      });
      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json(
          { error: text || 'Failed to update knowledge tool' },
          { status: 400 }
        );
      }
    }

    // Update assistant metadata; keep the knowledge tool even if no files remain
    const updates: Record<string, any> = {
      metadata: {
        ...(assistant.metadata || {}),
        knowledgeToolId,
        fileIds: nextFileIds,
      },
    };

    const updateResult = await updateUserAssistant(
      supabase,
      assistantId,
      updates
    );
    if (updateResult.error) {
      return NextResponse.json({ error: updateResult.error }, { status: 500 });
    }

    return NextResponse.json({ fileIds: nextFileIds });
  } catch (error) {
    logger.error(
      'VAPI_KNOWLEDGE',
      'Failed to detach file from assistant knowledge',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: 'Failed to detach file from assistant knowledge' },
      { status: 500 }
    );
  }
}
