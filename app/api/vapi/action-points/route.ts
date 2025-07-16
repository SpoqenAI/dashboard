import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { ActionPoints } from '@/lib/types';
import { createClient } from '@/lib/supabase/server';
// Removed Redis dependency - all analysis comes directly from VAPI

export async function POST(request: NextRequest) {
  try {
    const { callId } = await request.json();

    if (!callId) {
      return NextResponse.json(
        { error: 'Call ID is required' },
        { status: 400 }
      );
    }

    // Get authenticated user
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Fetch fresh call details from VAPI - no caching needed since VAPI is the source of truth

    // Fetch fresh call details from VAPI if not cached
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

    // Extract action points directly from VAPI's analysis (100% AI-generated)
    const actionPoints = extractActionPointsFromVapiAnalysis(callData.analysis || {});

    logger.info('ACTION_POINTS', 'Successfully generated action points', {
      callId,
      userId: logger.maskUserId(userId),
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
 * Extract action points from VAPI's native analysis using proper hierarchy
 * Uses VAPI's structuredData → summary → simple fallback (NO manual pattern matching)
 * This ensures 100% AI-generated analysis from VAPI
 */
function extractActionPointsFromVapiAnalysis(vapiAnalysis: any): ActionPoints {
  const structuredData = vapiAnalysis.structuredData || {};
  const summary = vapiAnalysis.summary || '';

  // Log what we received from VAPI for debugging
  logger.info('ACTION_POINTS', 'Processing VAPI analysis', {
    structuredDataKeys: Object.keys(structuredData),
    summaryLength: summary.length,
    structuredData: structuredData, // Log the actual structured data to see what VAPI provides
  });

  // VAPI Analysis Hierarchy: structuredData → summary → basic fallback
  // NO manual pattern matching or text analysis - rely purely on VAPI's AI

  const callPurpose =
    structuredData.callPurpose ||
    structuredData.purpose ||
    (summary ? 'Call inquiry (see summary)' : 'General inquiry');

  const sentiment =
    structuredData.sentiment ||
    'neutral'; // Only use VAPI's sentiment analysis

  const keyPoints = structuredData.keyPoints ||
    structuredData.key_points ||
    (summary ? [summary] : ['Standard inquiry']);

  const followUpItems =
    structuredData.followUpItems ||
    structuredData.follow_up_items ||
    structuredData.followUp ||
    [];

  const urgentConcerns =
    structuredData.urgentConcerns ||
    structuredData.urgent_concerns ||
    structuredData.urgent ||
    [];

  // Use VAPI's lead quality directly, fallback to 'cold'
  const leadQuality =
    structuredData.leadQuality ||
    structuredData.lead_quality ||
    'cold';

  // Extract additional analysis from VAPI's structured data only
  const appointmentRequested =
    structuredData.appointmentRequested ||
    structuredData.appointment_requested ||
    structuredData.appointment ||
    false;

  const timeline =
    structuredData.timeline ||
    structuredData.timeframe ||
    'Not specified';

  const contactPreference =
    structuredData.contactPreference ||
    structuredData.contact_preference ||
    structuredData.preferredContact ||
    'Phone call';

  // Business/service interest from VAPI
  const businessInterest =
    structuredData.businessInterest ||
    structuredData.business_interest ||
    structuredData.serviceInterest ||
    structuredData.productInterest ||
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
      propertyInterest: businessInterest, // Keep field name for compatibility
      budget: structuredData.budget || 'Not specified',
      timeline,
      contactPreference,
    },
  };
}

// NO MORE MANUAL PATTERN MATCHING - All analysis comes 100% from VAPI AI
// This optimization ensures we rely purely on VAPI's structured data and analysis
// with the hierarchy: structuredData → summary → simple fallback
