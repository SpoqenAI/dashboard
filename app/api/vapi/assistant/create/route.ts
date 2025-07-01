import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import logger from '@/lib/logger';

// POST /api/vapi/assistant/create
// Body: { assistantName: string; greeting: string }
export async function POST(req: NextRequest) {
  try {
    const { assistantName, greeting } = await req.json();

    if (!assistantName || !greeting) {
      return NextResponse.json(
        { error: 'assistantName and greeting are required' },
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

    /* ------------------------------------------------------------------
       1) Create assistant on Vapi
    ------------------------------------------------------------------ */
    const vapiApiKey = process.env.VAPI_PRIVATE_KEY;
    const vapiWebhookSecret = process.env.VAPI_WEBHOOK_SECRET;
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;

    if (!vapiApiKey || !vapiWebhookSecret || !appUrl) {
      logger.error('VAPI_CREATE', 'Missing Vapi env vars');
      return NextResponse.json(
        { error: 'Server misconfiguration — missing Vapi env vars' },
        { status: 500 }
      );
    }

    const vapiRes = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${vapiApiKey}`,
      },
      body: JSON.stringify({
        name: assistantName,
        model: {
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: greeting,
            },
          ],
        },
        voice: {
          provider: 'azure',
          voiceId: 'andrew',
        },
        serverUrl: `${appUrl}/api/vapi-webhook`,
        serverUrlSecret: vapiWebhookSecret,
      }),
    });

    if (!vapiRes.ok) {
      const txt = await vapiRes.text();
      logger.error('VAPI_CREATE', 'Vapi API failed', new Error(txt), {
        status: vapiRes.status,
      });
      return NextResponse.json(
        { error: 'Failed to create assistant in Vapi' },
        { status: 502 }
      );
    }

    const vapiAssistant = (await vapiRes.json()) as { id: string };

    /* ------------------------------------------------------------------
       2) Persist assistant_id in user_settings (one assistant per user)
    ------------------------------------------------------------------ */
    let adminClient;
    try {
      adminClient = createSupabaseAdmin();
    } catch (err) {
      logger.error('VAPI_CREATE', 'Failed to init supabase admin', err as Error);
      return NextResponse.json(
        { error: 'Server misconfiguration — supabase admin' },
        { status: 500 }
      );
    }

    const { error: updateErr } = await adminClient
      .from('user_settings')
      .update({ vapi_assistant_id: vapiAssistant.id })
      .eq('id', user.id);

    if (updateErr) {
      logger.error('VAPI_CREATE', 'Failed to store assistant_id', updateErr, {
        userId: user.id,
        assistantId: vapiAssistant.id,
      });
      // still return success because assistant is created, but warn client to retry
    }

    logger.info('VAPI_CREATE', 'Assistant created successfully', {
      userId: user.id,
      assistantId: vapiAssistant.id,
    });

    return NextResponse.json({ assistantId: vapiAssistant.id });
  } catch (err: any) {
    logger.error('VAPI_CREATE', 'Unhandled error', err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 