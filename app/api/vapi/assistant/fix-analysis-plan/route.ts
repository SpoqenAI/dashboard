import { NextRequest, NextResponse } from 'next/server';
import { getUserVapiAssistantId } from '@/lib/user-settings';
import { updateUserAssistant } from '@/lib/vapi-assistant';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// POST /api/vapi/assistant/fix-analysis-plan
// Updates existing assistant with a simplified analysis plan that works
export async function POST(req: NextRequest) {
  try {
    // Create authenticated Supabase client
    const supabase = await createClient();

    // Get user's assistant ID using user-scoped function
    const assistantResult = await getUserVapiAssistantId(supabase);

    if (assistantResult.error) {
      if (assistantResult.error === 'User not authenticated') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.json(
        { error: assistantResult.error },
        { status: 400 }
      );
    }

    const assistantId = assistantResult.data;
    if (!assistantId) {
      return NextResponse.json(
        { error: 'No assistant found for user' },
        { status: 404 }
      );
    }

    // Prepare the analysis plan update
    const analysisUpdates = {
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
              description: 'Quality of the lead based on interest and urgency',
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
              description: 'Whether the caller appears to be a decision maker',
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
    };

    // Use user-scoped function to update the assistant
    const result = await updateUserAssistant(
      supabase,
      assistantId,
      analysisUpdates
    );

    if (result.error) {
      // Handle different types of errors appropriately
      if (result.error === 'User not authenticated') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (result.error === 'Assistant not found or access denied') {
        return NextResponse.json(
          { error: 'Assistant not found or access denied' },
          { status: 403 }
        );
      }
      if (
        result.error === 'Server misconfiguration – missing VAPI_PRIVATE_KEY'
      ) {
        return NextResponse.json(
          { error: 'Server misconfiguration' },
          { status: 500 }
        );
      }
      if (result.error === 'Failed to update assistant in VAPI') {
        return NextResponse.json(
          { error: 'Failed to fix assistant analysis plan' },
          { status: 502 }
        );
      }

      // Generic error fallback
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

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
