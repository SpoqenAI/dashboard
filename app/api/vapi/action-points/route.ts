import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { ActionPoints } from '@/lib/types';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { callId } = await request.json();

    if (!callId) {
      return NextResponse.json(
        { error: 'Call ID is required' },
        { status: 400 }
      );
    }

    // First, fetch the call details from VAPI
    const vapiResponse = await fetch(
      `${process.env.VAPI_API_URL || 'https://api.vapi.ai'}/call/${callId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.VAPI_PRIVATE_KEY}`,
          Accept: 'application/json',
        },
      }
    );

    if (!vapiResponse.ok) {
      logger.error(
        'ACTION_POINTS',
        'Failed to fetch call details from VAPI',
        undefined,
        {
          callId,
          status: vapiResponse.status,
        }
      );
      return NextResponse.json(
        { error: 'Failed to fetch call details' },
        { status: vapiResponse.status }
      );
    }

    const callData = await vapiResponse.json();
    const transcript =
      callData.transcript ||
      callData.messages?.map((m: any) => `${m.role}: ${m.message}`).join('\n');
    const summary = callData.analysis?.summary || callData.summary;

    if (!transcript && !summary) {
      return NextResponse.json({
        actionPoints: {
          callPurpose: 'No transcript or summary available for analysis',
          sentiment: 'neutral' as const,
          keyPoints: [],
          followUpItems: [],
          urgentConcerns: [],
        },
      });
    }

    // Prepare the content for AI analysis
    const content = transcript || summary || '';

    // Generate action points using AI (you can replace this with your preferred LLM service)
    const actionPoints = await generateActionPointsWithAI(content, callData);

    // Save analysis results to database for future analytics
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        logger.error(
          'ACTION_POINTS',
          'Failed to get authenticated user',
          userError || new Error('No authenticated user')
        );
      } else {
        const { error: insertError } = await supabase
          .from('call_analysis')
          .upsert(
            {
              user_id: user.id,
              vapi_call_id: callId,
              call_purpose: actionPoints.callPurpose,
              sentiment: actionPoints.sentiment,
              lead_quality: actionPoints.callAnalysis?.leadQuality || 'cold',
              key_points: actionPoints.keyPoints,
              follow_up_items: actionPoints.followUpItems,
              urgent_concerns: actionPoints.urgentConcerns,
              property_interest:
                actionPoints.callAnalysis?.propertyInterest || null,
              timeline: actionPoints.callAnalysis?.timeline || null,
              contact_preference:
                actionPoints.callAnalysis?.contactPreference || null,
              appointment_requested:
                actionPoints.callAnalysis?.appointmentRequested || false,
              analyzed_at: new Date().toISOString(),
            },
            {
              onConflict: 'vapi_call_id',
            }
          );

        if (insertError) {
          logger.error(
            'ACTION_POINTS',
            'Failed to save call analysis to database',
            insertError
          );
        } else {
          logger.info(
            'ACTION_POINTS',
            'Successfully saved call analysis to database',
            { callId }
          );
        }
      }
    } catch (dbError) {
      logger.error(
        'ACTION_POINTS',
        'Database operation failed',
        dbError as Error
      );
    }

    logger.info('ACTION_POINTS', 'Successfully generated action points', {
      callId,
      hasTranscript: !!transcript,
      hasSummary: !!summary,
    });

    return NextResponse.json({ actionPoints });
  } catch (error) {
    logger.error(
      'ACTION_POINTS',
      'Error generating action points',
      error as Error
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateActionPointsWithAI(
  content: string,
  callData: any
): Promise<ActionPoints> {
  // This is a simplified AI analysis - you can integrate with OpenAI, Claude, or any LLM
  // For now, we'll do basic analysis based on content patterns

  const lowerContent = content.toLowerCase();

  // Sentiment analysis (basic)
  const positiveWords = [
    'great',
    'excellent',
    'interested',
    'perfect',
    'love',
    'amazing',
    'wonderful',
  ];
  const negativeWords = [
    'terrible',
    'awful',
    'hate',
    'disappointed',
    'problem',
    'issue',
    'wrong',
  ];

  const positiveCount = positiveWords.filter(word =>
    lowerContent.includes(word)
  ).length;
  const negativeCount = negativeWords.filter(word =>
    lowerContent.includes(word)
  ).length;

  let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
  if (positiveCount > negativeCount) sentiment = 'positive';
  else if (negativeCount > positiveCount) sentiment = 'negative';

  // Extract key points (basic pattern matching)
  const keyPoints: string[] = [];
  const followUpItems: string[] = [];
  const urgentConcerns: string[] = [];

  // Real estate specific analysis
  if (
    lowerContent.includes('appointment') ||
    lowerContent.includes('showing') ||
    lowerContent.includes('visit')
  ) {
    followUpItems.push('Schedule property showing or appointment');
  }

  if (
    lowerContent.includes('budget') ||
    lowerContent.includes('price') ||
    lowerContent.includes('afford')
  ) {
    keyPoints.push('Budget and pricing discussed');
  }

  if (
    lowerContent.includes('timeline') ||
    lowerContent.includes('when') ||
    lowerContent.includes('soon')
  ) {
    keyPoints.push('Timeline for purchase/sale discussed');
  }

  if (
    lowerContent.includes('urgent') ||
    lowerContent.includes('asap') ||
    lowerContent.includes('immediately')
  ) {
    urgentConcerns.push('Urgent timeline mentioned - follow up immediately');
  }

  if (
    lowerContent.includes('competitor') ||
    lowerContent.includes('other agent')
  ) {
    urgentConcerns.push('Mention of other agents/competitors - may lose lead');
  }

  // Determine call purpose
  let callPurpose = 'General inquiry';
  if (lowerContent.includes('buy') || lowerContent.includes('purchase')) {
    callPurpose = 'Buyer inquiry';
  } else if (lowerContent.includes('sell') || lowerContent.includes('list')) {
    callPurpose = 'Seller inquiry';
  } else if (lowerContent.includes('rent') || lowerContent.includes('lease')) {
    callPurpose = 'Rental inquiry';
  }

  return {
    callPurpose,
    sentiment,
    keyPoints:
      keyPoints.length > 0 ? keyPoints : ['Standard real estate inquiry'],
    followUpItems,
    urgentConcerns,
    callAnalysis: {
      leadQuality:
        urgentConcerns.length > 0
          ? 'hot'
          : keyPoints.length > 2
            ? 'warm'
            : 'cold',
      appointmentRequested:
        lowerContent.includes('appointment') ||
        lowerContent.includes('showing'),
      propertyInterest: extractPropertyType(lowerContent),
      timeline: extractTimeline(lowerContent),
      contactPreference: extractContactPreference(lowerContent),
    },
  };
}

function extractPropertyType(content: string): string {
  if (content.includes('condo') || content.includes('condominium'))
    return 'Condominium';
  if (content.includes('house') || content.includes('home'))
    return 'Single Family Home';
  if (content.includes('townhouse') || content.includes('townhome'))
    return 'Townhouse';
  if (content.includes('apartment')) return 'Apartment';
  if (content.includes('commercial')) return 'Commercial';
  return 'Not specified';
}

function extractTimeline(content: string): string {
  if (
    content.includes('immediately') ||
    content.includes('asap') ||
    content.includes('urgent')
  )
    return 'Immediate';
  if (content.includes('month') || content.includes('30 days'))
    return 'Within 1 month';
  if (content.includes('months') || content.includes('quarter'))
    return 'Within 3 months';
  if (content.includes('year')) return 'Within 1 year';
  return 'Not specified';
}

function extractContactPreference(content: string): string {
  if (content.includes('email')) return 'Email';
  if (content.includes('text') || content.includes('sms')) return 'Text/SMS';
  if (content.includes('call') || content.includes('phone')) return 'Phone';
  return 'Not specified';
}
