import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// DELETE /api/vapi/files/:id - deletes a file from Vapi storage
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const fileId = params.id;
    if (!fileId) {
      return NextResponse.json({ error: 'Missing file id' }, { status: 400 });
    }

    const res = await fetch(`https://api.vapi.ai/file/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const text = await res.text();
    if (!res.ok) {
      logger.error(
        'VAPI_FILE_DELETE',
        'Failed to delete file in Vapi',
        new Error(text),
        { status: res.status, fileId }
      );
      return NextResponse.json(
        { error: 'Failed to delete file', details: text },
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
