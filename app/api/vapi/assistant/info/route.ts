import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

// GET /api/vapi/assistant/info – returns the assistant JSON from Vapi for the authenticated user
export async function GET(req: NextRequest) {
  try {
    // Auth via SSR client (reads the cookie)
    const { createClient } = await import('@/lib/supabase/server');
    const supabaseSSR = await createClient();

    const {
      data: { user },
      error: authErr,
    } = await supabaseSSR.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get assistant id from user_settings using admin client (bypass RLS)
    const admin = createSupabaseAdmin();
    const { data: settingsRow, error: settingsErr } = await admin
      .from('user_settings')
      .select('vapi_assistant_id')
      .eq('id', user.id)
      .maybeSingle();

    if (settingsErr) throw settingsErr;

    const assistantId = settingsRow?.vapi_assistant_id;
    if (!assistantId) {
      return NextResponse.json({ assistant: null });
    }

    const apiKey = process.env.VAPI_PRIVATE_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Server misconfiguration – missing VAPI_PRIVATE_KEY' },
        { status: 500 }
      );
    }

    const vapiRes = await fetch(
      `https://api.vapi.ai/assistant/${assistantId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );
    if (!vapiRes.ok) {
      const txt = await vapiRes.text();
      logger.error('VAPI_INFO', 'Failed to get assistant', new Error(txt), {
        status: vapiRes.status,
        assistantId,
      });
      return NextResponse.json(
        { error: 'Failed to fetch assistant' },
        { status: 502 }
      );
    }

    const assistantJson = await vapiRes.json();
    return NextResponse.json({ assistant: assistantJson });
  } catch (err) {
    logger.error('VAPI_INFO', 'Unhandled', err as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
