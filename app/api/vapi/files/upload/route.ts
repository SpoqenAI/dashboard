import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// POST /api/vapi/files/upload
// Securely proxies a file upload to Vapi Files API using server-side credentials
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

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    // Reconstruct FormData for outbound request
    const outbound = new FormData();
    outbound.append('file', file, file.name);

    const vapiRes = await fetch('https://api.vapi.ai/file', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: outbound,
    });

    const text = await vapiRes.text();
    if (!vapiRes.ok) {
      logger.error(
        'VAPI_FILE_UPLOAD',
        'Failed to upload file to Vapi',
        new Error(text),
        { status: vapiRes.status }
      );
      return NextResponse.json(
        { error: 'Failed to upload file', details: text },
        { status: vapiRes.status }
      );
    }

    try {
      const json = JSON.parse(text);
      return NextResponse.json(json);
    } catch {
      return NextResponse.json({ raw: text });
    }
  } catch (error) {
    logger.error(
      'VAPI_FILE_UPLOAD',
      'Unexpected error during file upload',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: 'Unexpected error during file upload' },
      { status: 500 }
    );
  }
}
