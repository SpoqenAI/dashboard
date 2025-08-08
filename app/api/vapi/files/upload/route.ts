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

    // Basic upload validations: size and MIME type
    const maxBytesEnv = process.env.VAPI_UPLOAD_MAX_BYTES;
    const maxBytes =
      Number.isFinite(Number(maxBytesEnv)) && Number(maxBytesEnv) > 0
        ? Number(maxBytesEnv)
        : 300 * 1024; // default 300KB for optimal knowledge ingestion performance

    if (file.size === 0) {
      return NextResponse.json(
        { error: 'Empty file uploads are not allowed' },
        { status: 400 }
      );
    }

    if (file.size > maxBytes) {
      return NextResponse.json(
        {
          error: 'File too large',
          details: `Maximum allowed size is ${maxBytes} bytes`,
        },
        { status: 400 }
      );
    }

    // Vapi-supported types
    const allowedMimeTypes = new Set<string>([
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'text/csv', // .csv
      'text/markdown', // .md
      'text/tab-separated-values', // .tsv
      'application/x-yaml', // .yaml/.yml (common)
      'text/yaml', // alternative yaml
      'application/yaml', // alternative yaml
      'application/json', // .json
      'application/xml', // .xml
      'text/xml', // alternative xml
    ]);

    const inferMimeFromFilename = (filename: string): string | null => {
      const lower = filename.toLowerCase();
      if (lower.endsWith('.pdf')) return 'application/pdf';
      if (lower.endsWith('.txt')) return 'text/plain';
      if (lower.endsWith('.docx'))
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      if (lower.endsWith('.doc')) return 'application/msword';
      if (lower.endsWith('.csv')) return 'text/csv';
      if (lower.endsWith('.md')) return 'text/markdown';
      if (lower.endsWith('.tsv')) return 'text/tab-separated-values';
      if (lower.endsWith('.yaml') || lower.endsWith('.yml'))
        return 'application/x-yaml';
      if (lower.endsWith('.json')) return 'application/json';
      if (lower.endsWith('.xml')) return 'application/xml';
      if (lower.endsWith('.log')) return 'text/plain';
      return null;
    };

    const providedMime = file.type;
    const inferredMime = inferMimeFromFilename(file.name);
    const isAllowed =
      (providedMime && allowedMimeTypes.has(providedMime)) ||
      (inferredMime && allowedMimeTypes.has(inferredMime));

    if (!isAllowed) {
      return NextResponse.json(
        {
          error: 'Unsupported file type',
          details:
            'Allowed types: .txt, .pdf, .docx, .doc, .csv, .md, .tsv, .yaml, .yml, .json, .xml, .log',
        },
        { status: 400 }
      );
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
      // Return upstream status for non-JSON bodies so callers can detect failures
      return NextResponse.json(
        { raw: text },
        { status: vapiRes.status || 502 }
      );
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
