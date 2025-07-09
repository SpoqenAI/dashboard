import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

// POST /api/vapi/assistant/auto-create
// Body: { user_id: string, email: string }
export async function POST(req: NextRequest) {
  try {
    // Security: check secret header
    const secret = req.headers.get('x-supabase-secret');
    if (!secret || secret !== process.env.SUPABASE_TRIGGER_SECRET) {
      logger.warn('VAPI_AUTO_CREATE', 'Unauthorized trigger attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user_id, email } = await req.json();
    if (!user_id || !email) {
      return NextResponse.json({ error: 'user_id and email required' }, { status: 400 });
    }

    const admin = createSupabaseAdmin();
    // Check if assistant already exists
    const { data: settingsRow, error: settingsErr } = await admin
      .from('user_settings')
      .select('vapi_assistant_id')
      .eq('id', user_id)
      .maybeSingle();
    if (settingsErr) throw settingsErr;
    if (settingsRow?.vapi_assistant_id) {
      logger.info('VAPI_AUTO_CREATE', 'Assistant already exists', { userId: user_id });
      return NextResponse.json({ status: 'already_exists', assistantId: settingsRow.vapi_assistant_id });
    }

    // Create assistant on Vapi
    const vapiApiKey = process.env.VAPI_PRIVATE_KEY;
    const vapiWebhookSecret = process.env.VAPI_WEBHOOK_SECRET;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
    if (!vapiApiKey || !vapiWebhookSecret || !appUrl) {
      logger.error('VAPI_AUTO_CREATE', 'Missing Vapi env vars');
      return NextResponse.json({ error: 'Server misconfiguration — missing Vapi env vars' }, { status: 500 });
    }
    // Use default values for assistant
    const assistantName = 'Ava';
    const greeting = 'Hello! Thank you for calling. How can I assist you today?';
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
          model: 'gpt-4.1-nano',
          messages: [
            { role: 'system', content: greeting },
          ],
        },
        voice: {
          provider: 'deepgram',
          voiceId: 'luna',
        },
        serverUrl: `${appUrl}/api/webhooks/vapi`,
        serverUrlSecret: vapiWebhookSecret,
      }),
    });
    if (!vapiRes.ok) {
      const txt = await vapiRes.text();
      logger.error('VAPI_AUTO_CREATE', 'Vapi API failed', new Error(txt), { status: vapiRes.status });
      return NextResponse.json({ error: 'Failed to create assistant in Vapi' }, { status: 502 });
    }
    const vapiAssistant = (await vapiRes.json()) as { id: string };
    // Store assistant id
    const { error: updateErr } = await admin
      .from('user_settings')
      .update({ vapi_assistant_id: vapiAssistant.id })
      .eq('id', user_id);
    if (updateErr) {
      logger.error('VAPI_AUTO_CREATE', 'Failed to store assistant_id', updateErr, { userId: user_id, assistantId: vapiAssistant.id });
      // still return success because assistant is created, but warn client to retry
    }
    logger.info('VAPI_AUTO_CREATE', 'Assistant created successfully', { userId: user_id, assistantId: vapiAssistant.id });
    return NextResponse.json({ status: 'created', assistantId: vapiAssistant.id });
  } catch (err: any) {
    logger.error('VAPI_AUTO_CREATE', 'Unhandled error', err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 