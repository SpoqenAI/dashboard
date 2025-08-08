import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { secureJson } from '@/lib/api/response';
import * as Sentry from '@sentry/nextjs';
import {
  ALLOWED_MIME_TYPES,
  inferMimeFromFilename,
  isAllowedMime,
} from '@/lib/file-validation';

const { logger } = Sentry;

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
      return secureJson({ error: 'Not authenticated' }, { status: 401 });
    }

    const apiKey = process.env.VAPI_PRIVATE_KEY;
    if (!apiKey) {
      return secureJson(
        { error: 'Server misconfiguration – missing VAPI_PRIVATE_KEY' },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return secureJson({ error: 'Missing file' }, { status: 400 });
    }

    // Basic upload validations: size and MIME type
    const maxBytesEnv = process.env.VAPI_UPLOAD_MAX_BYTES;
    const maxBytes =
      Number.isFinite(Number(maxBytesEnv)) && Number(maxBytesEnv) > 0
        ? Number(maxBytesEnv)
        : 300 * 1024; // default 300KB for optimal knowledge ingestion performance

    if (file.size === 0) {
      return secureJson(
        { error: 'Empty file uploads are not allowed' },
        { status: 400 }
      );
    }

    if (file.size > maxBytes) {
      return secureJson(
        {
          error: 'File too large',
          details: `Maximum allowed size is ${maxBytes} bytes`,
        },
        { status: 400 }
      );
    }

    // Vapi-supported types (shared)
    const providedMime = file.type;
    const inferredMime = inferMimeFromFilename(file.name);
    const isAllowed =
      isAllowedMime(providedMime) || isAllowedMime(inferredMime);

    if (!isAllowed) {
      return secureJson(
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
      logger.fmt`level=${'error'} event=${'VAPI_FILE_UPLOAD'} message=${'Failed to upload file to Vapi'} status=${vapiRes.status} detail=${text?.slice(0, 500)}`;
      return secureJson(
        { error: 'Failed to upload file', details: text },
        { status: vapiRes.status }
      );
    }

    try {
      const json = JSON.parse(text);
      return secureJson(json);
    } catch {
      // Return upstream status for non-JSON bodies so callers can detect failures
      return secureJson({ raw: text }, { status: vapiRes.status || 502 });
    }
  } catch (error) {
    logger.fmt`level=${'error'} event=${'VAPI_FILE_UPLOAD'} message=${'Unexpected error during file upload'} errorMessage=${
      error instanceof Error ? error.message : String(error)
    } stack=${error instanceof Error ? error.stack || '' : ''}`;
    return secureJson(
      { error: 'Unexpected error during file upload' },
      { status: 500 }
    );
  }
}
