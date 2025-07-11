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

    // --- PERFORMANCE OPTIMIZATION --------------------------------------------------
    // Check if we already have a comprehensive analysis stored. If so, return it to
    // avoid hitting VAPI and re-processing the same call every time the user opens
    // the modal. This dramatically speeds up subsequent openings and reduces API
    // cost / latency.

    // NOTE: We consider the analysis "complete" if we have at least key_points OR
    // follow_up_items OR urgent_concerns stored. Adjust this heuristic as needed.

    try {
      const supabase = await createClient();
      const { data: existing, error: existingErr } = await supabase
        .from('call_analysis')
        .select(
          `call_purpose, sentiment, key_points, follow_up_items, urgent_concerns, lead_quality, appointment_requested, property_interest, timeline, contact_preference`
        )
        .eq('vapi_call_id', callId)
        .single();

      if (!existingErr && existing) {
        const alreadyHasPoints =
          (existing.key_points && existing.key_points.length > 0) ||
          (existing.follow_up_items && existing.follow_up_items.length > 0) ||
          (existing.urgent_concerns && existing.urgent_concerns.length > 0);

        if (alreadyHasPoints) {
          const cached: ActionPoints = {
            callPurpose: existing.call_purpose || undefined,
            sentiment: existing.sentiment || undefined,
            keyPoints: existing.key_points || [],
            followUpItems: existing.follow_up_items || [],
            urgentConcerns: existing.urgent_concerns || [],
            callAnalysis: {
              leadQuality: (existing.lead_quality || 'cold') as any,
              appointmentRequested: existing.appointment_requested || false,
              propertyInterest: existing.property_interest || undefined,
              timeline: existing.timeline || undefined,
              contactPreference: existing.contact_preference || undefined,
            },
          };

          logger.info('ACTION_POINTS', 'Returning cached analysis', {
            callId,
          });

          return NextResponse.json({ actionPoints: cached });
        }
      }
    } catch (cacheErr) {
      logger.error('ACTION_POINTS', 'Cache check failed', cacheErr as Error);
      // Continue to full analysis path if cache fails
    }

    // ------------------------------------------------------------------------------

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

    // Log VAPI analysis data to understand what's available
    logger.info('ACTION_POINTS', 'VAPI call analysis data', {
      callId,
      hasAnalysis: !!callData.analysis,
      analysisFields: callData.analysis ? Object.keys(callData.analysis) : null,
      hasSummary: !!callData.analysis?.summary,
      hasStructuredData: !!callData.analysis?.structuredData,
      hasSuccessEvaluation: !!callData.analysis?.successEvaluation,
      structuredDataFields: callData.analysis?.structuredData
        ? Object.keys(callData.analysis.structuredData)
        : null,
    });

    // Extract action points directly from VAPI's analysis
    const actionPoints = extractActionPointsFromVapiAnalysis(callData);

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
      source: 'VAPI_NATIVE_ANALYSIS',
      hasVapiStructuredData: !!callData.analysis?.structuredData,
      hasVapiSummary: !!callData.analysis?.summary,
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

/**
 * Extract action points from VAPI's native analysis instead of hardcoded patterns
 * This leverages VAPI's AI-powered structured data extraction
 */
function extractActionPointsFromVapiAnalysis(callData: any): ActionPoints {
  const analysis = callData.analysis || {};
  const structuredData = analysis.structuredData || {};
  const summary = analysis.summary || '';

  // Log what we received from VAPI for debugging
  logger.info('ACTION_POINTS', 'Processing VAPI analysis', {
    callId: callData.id,
    structuredDataKeys: Object.keys(structuredData),
    summaryLength: summary.length,
    structuredData: structuredData, // Log the actual structured data to see what VAPI provides
  });

  // Extract data from VAPI's structured data if available
  const callPurpose =
    structuredData.callPurpose ||
    structuredData.purpose ||
    extractCallPurposeFromSummary(summary) ||
    'General inquiry';

  const sentiment =
    structuredData.sentiment ||
    extractSentimentFromSummary(summary) ||
    'neutral';

  const keyPoints = structuredData.keyPoints ||
    structuredData.key_points ||
    extractKeyPointsFromSummary(summary) || ['Standard inquiry'];

  const followUpItems =
    structuredData.followUpItems ||
    structuredData.follow_up_items ||
    structuredData.followUp ||
    extractFollowUpFromSummary(summary) ||
    [];

  const urgentConcerns =
    structuredData.urgentConcerns ||
    structuredData.urgent_concerns ||
    structuredData.urgent ||
    extractUrgentFromSummary(summary) ||
    [];

  // Enhanced lead quality determination
  const leadQuality = determineLeadQuality(
    structuredData,
    summary,
    urgentConcerns
  );

  // Extract additional analysis from structured data
  const appointmentRequested =
    structuredData.appointmentRequested ||
    structuredData.appointment_requested ||
    structuredData.appointment ||
    summary.toLowerCase().includes('appointment') ||
    summary.toLowerCase().includes('meeting') ||
    false;

  const timeline =
    structuredData.timeline ||
    structuredData.timeframe ||
    extractTimelineFromSummary(summary) ||
    'Not specified';

  const contactPreference =
    structuredData.contactPreference ||
    structuredData.contact_preference ||
    structuredData.preferredContact ||
    extractContactPreferenceFromSummary(summary) ||
    'Phone call';

  // For business interests (replacing property_interest from real estate focus)
  const businessInterest =
    structuredData.businessInterest ||
    structuredData.business_interest ||
    structuredData.serviceInterest ||
    structuredData.productInterest ||
    extractBusinessInterestFromSummary(summary) ||
    'Not specified';

  return {
    callPurpose,
    sentiment: sentiment as 'positive' | 'negative' | 'neutral',
    keyPoints: Array.isArray(keyPoints) ? keyPoints : [keyPoints],
    followUpItems: Array.isArray(followUpItems) ? followUpItems : [],
    urgentConcerns: Array.isArray(urgentConcerns) ? urgentConcerns : [],
    callAnalysis: {
      leadQuality: leadQuality as 'hot' | 'warm' | 'cold',
      appointmentRequested,
      propertyInterest: businessInterest, // Keep the field name for DB compatibility but use for business interest
      timeline,
      contactPreference,
    },
  };
}

/**
 * Helper functions to extract data from summary when structured data is not available
 * These are fallbacks and should be industry-agnostic
 */

function extractCallPurposeFromSummary(summary: string): string {
  const lower = summary.toLowerCase();

  // General business purposes (not real estate specific)
  if (lower.includes('demo') || lower.includes('demonstration'))
    return 'Product demo request';
  if (lower.includes('quote') || lower.includes('pricing'))
    return 'Pricing inquiry';
  if (lower.includes('support') || lower.includes('help'))
    return 'Support request';
  if (lower.includes('partnership') || lower.includes('collaboration'))
    return 'Partnership inquiry';
  if (lower.includes('investment') || lower.includes('funding'))
    return 'Investment inquiry';
  if (
    lower.includes('job') ||
    lower.includes('career') ||
    lower.includes('hiring')
  )
    return 'Career inquiry';

  return 'General inquiry';
}

function extractSentimentFromSummary(summary: string): string {
  const lower = summary.toLowerCase();

  const positiveWords = [
    'great',
    'excellent',
    'love',
    'perfect',
    'amazing',
    'wonderful',
    'interested',
    'excited',
    'impressed',
    'satisfied',
  ];
  const negativeWords = [
    'terrible',
    'awful',
    'hate',
    'disappointed',
    'frustrated',
    'angry',
    'problem',
    'issue',
    'complaint',
  ];

  const positiveCount = positiveWords.filter(word =>
    lower.includes(word)
  ).length;
  const negativeCount = negativeWords.filter(word =>
    lower.includes(word)
  ).length;

  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

function extractKeyPointsFromSummary(summary: string): string[] {
  const points: string[] = [];
  const lower = summary.toLowerCase();

  // Generic business discussion points
  if (
    lower.includes('budget') ||
    lower.includes('price') ||
    lower.includes('cost')
  ) {
    points.push('Budget and pricing discussed');
  }
  if (
    lower.includes('timeline') ||
    lower.includes('when') ||
    lower.includes('schedule')
  ) {
    points.push('Timeline requirements mentioned');
  }
  if (
    lower.includes('feature') ||
    lower.includes('capability') ||
    lower.includes('functionality')
  ) {
    points.push('Product features discussed');
  }
  if (
    lower.includes('team') ||
    lower.includes('company') ||
    lower.includes('organization')
  ) {
    points.push('Team or company details shared');
  }

  return points.length > 0 ? points : ['Standard inquiry'];
}

function extractFollowUpFromSummary(summary: string): string[] {
  const items: string[] = [];
  const lower = summary.toLowerCase();

  if (lower.includes('demo') || lower.includes('presentation')) {
    items.push('Schedule product demo');
  }
  if (
    lower.includes('send') ||
    lower.includes('email') ||
    lower.includes('information')
  ) {
    items.push('Send additional information');
  }
  if (lower.includes('call back') || lower.includes('follow up')) {
    items.push('Follow up call required');
  }
  if (lower.includes('proposal') || lower.includes('quote')) {
    items.push('Prepare proposal or quote');
  }

  return items;
}

function extractUrgentFromSummary(summary: string): string[] {
  const concerns: string[] = [];
  const lower = summary.toLowerCase();

  if (
    lower.includes('urgent') ||
    lower.includes('asap') ||
    lower.includes('immediately')
  ) {
    concerns.push('Urgent timeline - immediate attention required');
  }
  if (
    lower.includes('competitor') ||
    lower.includes('alternative') ||
    lower.includes('other option')
  ) {
    concerns.push('Considering alternatives - risk of losing lead');
  }
  if (lower.includes('deadline') || lower.includes('time sensitive')) {
    concerns.push('Time-sensitive decision mentioned');
  }

  return concerns;
}

function extractTimelineFromSummary(summary: string): string {
  const lower = summary.toLowerCase();

  if (
    lower.includes('immediately') ||
    lower.includes('asap') ||
    lower.includes('urgent')
  ) {
    return 'Immediate (ASAP)';
  }
  if (lower.includes('this week') || lower.includes('7 days')) {
    return 'Within 1 week';
  }
  if (lower.includes('this month') || lower.includes('30 days')) {
    return 'Within 1 month';
  }
  if (lower.includes('quarter') || lower.includes('3 months')) {
    return 'Within 3 months';
  }
  if (lower.includes('6 months') || lower.includes('half year')) {
    return 'Within 6 months';
  }
  if (lower.includes('no rush') || lower.includes('just exploring')) {
    return 'No specific timeline';
  }

  return 'Not specified';
}

function extractContactPreferenceFromSummary(summary: string): string {
  const lower = summary.toLowerCase();

  if (lower.includes('email')) return 'Email';
  if (lower.includes('text') || lower.includes('sms')) return 'Text/SMS';
  if (lower.includes('slack') || lower.includes('teams')) return 'Team chat';
  if (lower.includes('video call') || lower.includes('zoom'))
    return 'Video call';
  if (lower.includes('call') || lower.includes('phone')) return 'Phone call';

  return 'Phone call'; // Default
}

function extractBusinessInterestFromSummary(summary: string): string {
  const lower = summary.toLowerCase();

  // Tech/SaaS focused categories (aligned with current target audience)
  if (lower.includes('saas') || lower.includes('software'))
    return 'SaaS Solution';
  if (lower.includes('api') || lower.includes('integration'))
    return 'API/Integration';
  if (lower.includes('analytics') || lower.includes('data'))
    return 'Analytics/Data';
  if (lower.includes('automation') || lower.includes('workflow'))
    return 'Automation';
  if (lower.includes('ai') || lower.includes('artificial intelligence'))
    return 'AI Solution';
  if (lower.includes('marketing') || lower.includes('growth'))
    return 'Marketing/Growth';
  if (lower.includes('security') || lower.includes('compliance'))
    return 'Security/Compliance';
  if (lower.includes('infrastructure') || lower.includes('hosting'))
    return 'Infrastructure';

  return 'Not specified';
}

function determineLeadQuality(
  structuredData: any,
  summary: string,
  urgentConcerns: string[]
): string {
  // Check if VAPI already determined lead quality
  if (structuredData.leadQuality || structuredData.lead_quality) {
    return structuredData.leadQuality || structuredData.lead_quality;
  }

  const lower = summary.toLowerCase();

  // Hot leads: urgent, budget confirmed, decision maker
  if (
    urgentConcerns.length > 0 ||
    lower.includes('budget approved') ||
    lower.includes('decision maker') ||
    lower.includes('ready to purchase') ||
    lower.includes('need it asap')
  ) {
    return 'hot';
  }

  // Warm leads: interested, timeline defined, engaged
  if (
    lower.includes('interested') ||
    lower.includes('timeline') ||
    lower.includes('demo') ||
    lower.includes('proposal') ||
    lower.includes('next steps')
  ) {
    return 'warm';
  }

  // Cold leads: just browsing or general inquiry
  return 'cold';
}
