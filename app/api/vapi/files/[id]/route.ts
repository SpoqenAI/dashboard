import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { getUserAssistantInfo } from '@/lib/vapi-assistant';

// DELETE /api/vapi/files/:id - deletes a file from Vapi storage
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { params } = context;
    const resolvedParams = await params;
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

    const { id: fileId } = resolvedParams;
    if (!fileId) {
      return NextResponse.json({ error: 'Missing file id' }, { status: 400 });
    }

    // Verify the file belongs to the authenticated user's assistant before deleting
    const assistantResult = await getUserAssistantInfo(supabase as any);
    if (assistantResult.error || !assistantResult.data) {
      return NextResponse.json(
        { error: assistantResult.error || 'Assistant not found' },
        { status: 400 }
      );
    }
    const assistant = assistantResult.data;
    const metadata = assistant?.metadata || {};
    const userFileIds: string[] = Array.isArray(metadata.fileIds)
      ? metadata.fileIds
      : [];

    if (!userFileIds.includes(fileId)) {
      // Avoid leaking cross-tenant file existence
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const res = await fetch(`https://api.vapi.ai/file/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const text = await res.text();
    if (!res.ok) {
      const snippet = text ? text.slice(0, 200) : '';
      logger.error(
        'VAPI_FILE_DELETE',
        'Failed to delete file in Vapi',
        new Error(snippet || `status ${res.status}`),
        { status: res.status, fileId, bodyPreviewLength: text?.length || 0 }
      );
      return NextResponse.json(
        { error: 'Failed to delete file' },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      'VAPI_FILE_DELETE',
      'Unexpected error deleting file',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: 'Unexpected error deleting file' },
      { status: 500 }
    );
  }
}
