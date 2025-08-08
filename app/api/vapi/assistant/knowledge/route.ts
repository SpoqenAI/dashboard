import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getUserAssistantInfo,
  validateAssistantId,
} from '@/lib/vapi-assistant';
import { logger } from '@/lib/logger';

// GET /api/vapi/assistant/knowledge?assistantId=...
// Returns assistant knowledge linkage: toolId, fileIds, and file metadata
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const assistantId = searchParams.get('assistantId') || '';

    if (!assistantId || !validateAssistantId(assistantId)) {
      return NextResponse.json(
        { error: 'Invalid assistantId' },
        { status: 400 }
      );
    }

    // Use user-scoped helper which verifies ownership and fetches assistant
    const assistantResult = await getUserAssistantInfo(supabase);
    if (assistantResult.error) {
      return NextResponse.json(
        { error: assistantResult.error },
        { status: 400 }
      );
    }
    const assistant = assistantResult.data;
    if (!assistant || assistant.id !== assistantId) {
      return NextResponse.json(
        { error: 'Assistant not found' },
        { status: 404 }
      );
    }

    const apiKey = process.env.VAPI_PRIVATE_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Server misconfiguration – missing VAPI_PRIVATE_KEY' },
        { status: 500 }
      );
    }

    const metadata = assistant.metadata || {};
    const fileIds: string[] = Array.isArray(metadata.fileIds)
      ? metadata.fileIds
      : [];

    // Fetch file metadata for display – in parallel for performance
    const files: Array<{ id: string; name?: string; size?: number }> =
      await Promise.all(
        fileIds.map(async id => {
          try {
            const res = await fetch(`https://api.vapi.ai/file/${id}`, {
              headers: { Authorization: `Bearer ${apiKey}` },
            });
            if (res.ok) {
              const json = await res.json();
              return { id, name: json.name, size: json.size } as const;
            }
            return { id } as const;
          } catch {
            return { id } as const;
          }
        })
      );

    const knowledgeToolId: string | null = metadata.knowledgeToolId || null;
    return NextResponse.json({ toolId: knowledgeToolId, fileIds, files });
  } catch (error) {
    logger.error(
      'VAPI_KNOWLEDGE',
      'Failed to fetch assistant knowledge state',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: 'Failed to fetch assistant knowledge state' },
      { status: 500 }
    );
  }
}
