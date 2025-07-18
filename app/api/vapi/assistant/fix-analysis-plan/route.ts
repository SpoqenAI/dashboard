import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

// POST /api/vapi/assistant/fix-analysis-plan
// Updates existing assistant with a simplified analysis plan that works
export async function POST(req: NextRequest) {
  try {
    // Get currently authenticated user
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's assistant ID
    const adminClient = createSupabaseAdmin();
    const { data: settingsRow, error: settingsError } = await adminClient
      .from('user_settings')
      .select('vapi_assistant_id')
      .eq('id', user.id)
      .maybeSingle();

    if (settingsError || !settingsRow?.vapi_assistant_id) {
      return NextResponse.json(
        { error: 'No assistant found for user' },
        { status: 404 }
      );
    }

    const vapiApiKey = process.env.VAPI_PRIVATE_KEY;
    if (!vapiApiKey) {
      logger.error('VAPI_FIX', 'Missing VAPI_PRIVATE_KEY env var');
      return NextResponse.json(
        { error: 'Server misconfiguration' },
        { status: 500 }
      );
    }

    // Update the assistant with a simplified analysis plan that works
    const vapiRes = await fetch(
      `https://api.vapi.ai/assistant/${settingsRow.vapi_assistant_id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vapiApiKey}`,
        },
        body: JSON.stringify({
          analysisPlan: {
            summaryPrompt:
              "You are an expert call analyst. Summarize this call in 2-3 sentences, focusing on the caller's main purpose, key discussion points, and any outcomes or next steps.",

            structuredDataPrompt:
              'You are an expert data extractor for business calls. Extract structured data from this call transcript focusing on lead qualification, customer intent, and business opportunities. Provide reasoning for your sentiment and lead quality assessments when possible.',

            structuredDataSchema: {
              type: 'object',
              properties: {
                sentiment: {
                  type: 'string',
                  enum: ['positive', 'neutral', 'negative'],
                  description: 'Overall sentiment of the caller',
                },
                leadQuality: {
                  type: 'string',
                  enum: ['hot', 'warm', 'cold'],
                  description:
                    'Quality of the lead based on interest and urgency',
                },
                callPurpose: {
                  type: 'string',
                  description: 'Main reason for the call',
                },
                keyPoints: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Important points discussed during the call',
                },
                followUpItems: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Action items or follow-up tasks identified',
                },
                urgentConcerns: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Any urgent issues or time-sensitive matters',
                },
                appointmentRequested: {
                  type: 'boolean',
                  description:
                    'Whether the caller requested an appointment or meeting',
                },
                timeline: {
                  type: 'string',
                  description:
                    'Timeframe mentioned by caller (immediate, within a week, month, etc.)',
                },
                contactPreference: {
                  type: 'string',
                  description:
                    'Preferred method of contact (phone, email, text, etc.)',
                },
                businessInterest: {
                  type: 'string',
                  description:
                    'Specific business interest or service inquired about',
                },
                budget_mentioned: {
                  type: 'boolean',
                  description: 'Whether budget or pricing was discussed',
                },
                decision_maker: {
                  type: 'boolean',
                  description:
                    'Whether the caller appears to be a decision maker',
                },
                // Made these optional to prevent analysis failures
                sentimentAnalysisReasoning: {
                  type: 'string',
                  description:
                    'Brief explanation of why this sentiment was assigned based on conversation tone and language patterns.',
                },
                leadQualityReasoning: {
                  type: 'string',
                  description:
                    'Brief explanation of why this lead quality score was assigned based on engagement and interest signals.',
                },
              },
              // Only require the core fields, make reasoning optional
              required: ['sentiment', 'leadQuality', 'callPurpose'],
            },

            successEvaluationPrompt:
              'Evaluate if this call was successful based on: 1) Did the caller get their questions answered? 2) Was relevant information exchanged? 3) Were next steps established? 4) Did the conversation flow naturally without technical issues?',

            successEvaluationRubric: 'PassFail',
          },
        }),
      }
    );

    if (!vapiRes.ok) {
      const txt = await vapiRes.text();
      logger.error('VAPI_FIX', 'Failed to fix assistant', new Error(txt), {
        userId: logger.maskUserId(user.id),
        assistantId: settingsRow.vapi_assistant_id,
        status: vapiRes.status,
      });
      return NextResponse.json(
        { error: 'Failed to fix assistant analysis plan' },
        { status: 502 }
      );
    }

    logger.info('VAPI_FIX', 'Assistant analysis plan fixed successfully', {
      userId: logger.maskUserId(user.id),
      assistantId: settingsRow.vapi_assistant_id,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error(
      'VAPI_FIX',
      'Unhandled error',
      err instanceof Error ? err : new Error(String(err))
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
