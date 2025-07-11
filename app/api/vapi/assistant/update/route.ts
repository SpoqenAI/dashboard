import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

// PATCH /api/vapi/assistant/update - Update VAPI assistant properties like firstMessage
export async function PATCH(req: NextRequest) {
  try {
    const { assistantId, firstMessage } = await req.json();

    if (!assistantId || !firstMessage) {
      return NextResponse.json(
        { error: 'assistantId and firstMessage are required' },
        { status: 400 }
      );
    }

    // Get currently authenticated user (via cookie) using Supabase SSR client
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user owns this assistant
    const admin = createSupabaseAdmin();
    const { data: settingsRow, error: settingsErr } = await admin
      .from('user_settings')
      .select('vapi_assistant_id')
      .eq('id', user.id)
      .maybeSingle();

    if (settingsErr) {
      logger.error('VAPI_UPDATE', 'Failed to fetch user settings', settingsErr);
      return NextResponse.json(
        { error: 'Failed to verify assistant ownership' },
        { status: 500 }
      );
    }

    if (settingsRow?.vapi_assistant_id !== assistantId) {
      return NextResponse.json(
        { error: 'Assistant not found or access denied' },
        { status: 403 }
      );
    }

    // Update assistant via VAPI API
    const vapiApiKey = process.env.VAPI_PRIVATE_KEY;
    if (!vapiApiKey) {
      logger.error('VAPI_UPDATE', 'Missing VAPI_PRIVATE_KEY env var');
      return NextResponse.json(
        { error: 'Server misconfiguration — missing VAPI_PRIVATE_KEY' },
        { status: 500 }
      );
    }

    const vapiRes = await fetch(
      `https://api.vapi.ai/assistant/${assistantId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vapiApiKey}`,
        },
        body: JSON.stringify({
          firstMessage: firstMessage.trim(),
        }),
      }
    );

    if (!vapiRes.ok) {
      const txt = await vapiRes.text();
      logger.error('VAPI_UPDATE', 'VAPI API failed', new Error(txt), {
        status: vapiRes.status,
        assistantId,
      });
      return NextResponse.json(
        { error: 'Failed to update assistant in VAPI' },
        { status: 502 }
      );
    }

    logger.info('VAPI_UPDATE', 'Assistant updated successfully', {
      userId: logger.maskUserId(user.id),
      assistantId,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error(
      'VAPI_UPDATE',
      'Unhandled error',
      err instanceof Error ? err : new Error(String(err))
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 