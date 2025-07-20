import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { ActionPoints } from '@/lib/types';
import { createClient } from '@/lib/supabase/server';
import * as Sentry from '@sentry/nextjs';
// Removed Redis dependency - all analysis comes directly from VAPI

/**
 * Validates callId format for basic input validation
 * Since we no longer use callId in URLs, this is just basic format validation
 *
 * @param callId - The call ID to validate
 * @returns boolean - True if the ID has a valid format
 */
function validateCallId(callId: string): boolean {
  // Input validation
  if (!callId || typeof callId !== 'string') {
    logger.error(
      'ACTION_POINTS_SECURITY',
      'Invalid callId: null, undefined, or non-string value',
      new Error(`Rejected callId: ${callId}`),
      { callId }
    );
    return false;
  }

  // Trim whitespace and check for empty string
  const trimmedId = callId.trim();
  if (trimmedId.length === 0) {
    logger.error(
      'ACTION_POINTS_SECURITY',
      'Invalid callId: empty string after trimming',
      new Error(`Rejected callId: "${callId}"`),
      { callId }
    );
    return false;
  }

  // Basic format validation - VAPI call IDs are typically alphanumeric with dashes/underscores
  // Length between 8 and 64 characters
  const isValidCallId = /^[a-zA-Z0-9\-_]{8,64}$/.test(trimmedId);

  if (!isValidCallId) {
    logger.error(
      'ACTION_POINTS_SECURITY',
      'Invalid callId format detected',
      new Error(`Rejected callId: ${trimmedId}`),
      {
        callId: trimmedId,
        length: trimmedId.length,
        allowedPattern: 'a-zA-Z, 0-9, -, _ (8-64 chars)',
      }
    );
  }

  return isValidCallId;
}

export async function POST(request: NextRequest) {
  return Sentry.startSpan(
    {
      name: 'POST /api/vapi/action-points',
      op: 'http.server',
    },
    async () => {
      try {
        const { callId } = await request.json();

        if (!callId) {
          return NextResponse.json(
            { error: 'Call ID is required' },
            { status: 400 }
          );
        }

        // Validate callId format for basic input validation
        if (!validateCallId(callId)) {
          return NextResponse.json(
            { error: 'Invalid call ID format' },
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

        // Get the user's VAPI assistant ID from user_settings for security verification
        const { data: userSettings } = await supabase
          .from('user_settings')
          .select('vapi_assistant_id')
          .eq('id', user.id)
          .single();

        const userAssistantId = userSettings?.vapi_assistant_id;

        if (!userAssistantId) {
          return NextResponse.json(
            { error: 'No assistant configured for user' },
            { status: 403 }
          );
        }

        // Fetch all calls for the user's assistant from VAPI to avoid user input in URLs
        // This prevents SSRF attacks by using a fixed endpoint with no user input

        const vapiResponse = await Sentry.startSpan(
          {
            name: 'fetchVapiCalls',
            op: 'http.client',
          },
          async () => {
            // Use fixed endpoint with assistant ID - no user input in URL
            const baseUrl = process.env.VAPI_API_URL || 'https://api.vapi.ai';
            const url = new URL('/call', baseUrl);
            url.searchParams.set('assistantId', userAssistantId);
            url.searchParams.set('limit', '100'); // Reasonable limit to find recent calls

            return await fetch(url.toString(), {
              headers: {
                Authorization: `Bearer ${process.env.VAPI_PRIVATE_KEY}`,
                Accept: 'application/json',
                'User-Agent': 'spoqen-dashboard/1.0',
              },
              signal: AbortSignal.timeout(15000),
            });
          }
        );

        if (!vapiResponse.ok) {
          logger.error(
            'ACTION_POINTS',
            'Failed to fetch calls from VAPI',
            undefined,
            {
              userAssistantId,
              status: vapiResponse.status,
            }
          );
          return NextResponse.json(
            { error: 'Failed to fetch call data' },
            { status: vapiResponse.status }
          );
        }

        const callsData = await vapiResponse.json();
        const calls = Array.isArray(callsData) ? callsData : [];

        // Find the specific call by ID in the fetched data
        const callData = calls.find((call: any) => call.id === callId);

        if (!callData) {
          logger.warn('ACTION_POINTS', 'Call not found for user', {
            callId,
            userId: logger.maskUserId(userId),
            userAssistantId,
            totalCallsFetched: calls.length,
          });
          return NextResponse.json(
            { error: 'Call not found or access denied' },
            { status: 404 }
          );
        }

        // Verify the call belongs to the user's assistant (double-check)
        if (callData.assistantId !== userAssistantId) {
          logger.warn('ACTION_POINTS', 'Unauthorized access attempt', {
            callId,
            userId: logger.maskUserId(userId),
            callAssistantId: callData.assistantId,
            userAssistantId,
          });
          return NextResponse.json(
            { error: 'Unauthorized access to call' },
            { status: 403 }
          );
        }

        // Log VAPI analysis data to understand what's available
        logger.info('ACTION_POINTS', 'VAPI call analysis data', {
          callId,
          hasAnalysis: !!callData.analysis,
          analysisFields: callData.analysis
            ? Object.keys(callData.analysis)
            : null,
          hasSummary: !!callData.analysis?.summary,
          hasStructuredData: !!callData.analysis?.structuredData,
          hasSuccessEvaluation: !!callData.analysis?.successEvaluation,
          structuredDataFields: callData.analysis?.structuredData
            ? Object.keys(callData.analysis.structuredData)
            : null,
        });

        // Extract action points directly from VAPI's analysis (100% AI-generated)
        const actionPoints = extractActionPointsFromVapiAnalysis(
          callData.analysis || {}
        );

        logger.info('ACTION_POINTS', 'Successfully generated action points', {
          callId,
          userId: logger.maskUserId(userId),
          source: 'VAPI_NATIVE_ANALYSIS',
          hasVapiStructuredData: !!callData.analysis?.structuredData,
          hasVapiSummary: !!callData.analysis?.summary,
          totalCallsFetched: calls.length,
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
  );
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

  const sentiment = structuredData.sentiment || 'neutral'; // Only use VAPI's sentiment analysis

  const keyPoints =
    structuredData.keyPoints ||
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
    structuredData.leadQuality || structuredData.lead_quality || 'cold';

  // Extract additional analysis from VAPI's structured data only
  const appointmentRequested =
    structuredData.appointmentRequested ||
    structuredData.appointment_requested ||
    structuredData.appointment ||
    false;

  const timeline =
    structuredData.timeline || structuredData.timeframe || 'Not specified';

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
