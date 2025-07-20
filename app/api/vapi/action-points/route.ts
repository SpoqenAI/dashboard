import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { ActionPoints } from '@/lib/types';
import { createClient } from '@/lib/supabase/server';
import * as Sentry from '@sentry/nextjs';
// Removed Redis dependency - all analysis comes directly from VAPI

/**
 * Validates callId to prevent SSRF attacks
 * Ensures the ID matches a safe pattern before using in URLs
 *
 * @param callId - The call ID to validate
 * @returns boolean - True if the ID is valid and safe to use in URLs
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

  // Check for common SSRF attack patterns
  const ssrfPatterns = [
    /:\/\//, // Protocol separators (http://, https://, etc.)
    /localhost/i, // Localhost references
    /127\.0\.0\.1/, // Local IP addresses
    /0\.0\.0\.0/, // All interfaces
    /::1/, // IPv6 localhost
    /\.\./, // Directory traversal attempts
    /[<>"']/, // HTML/XML injection attempts
    /\s/, // Whitespace characters
    /[^\x20-\x7E]/, // Non-printable ASCII characters
  ];

  for (const pattern of ssrfPatterns) {
    if (pattern.test(trimmedId)) {
      logger.error(
        'ACTION_POINTS_SECURITY',
        'SSRF attack pattern detected in callId',
        new Error(`Rejected callId with pattern ${pattern}: ${trimmedId}`),
        { callId: trimmedId, pattern: pattern.toString() }
      );
      return false;
    }
  }

  // VAPI call IDs are typically alphanumeric with dashes/underscores
  // This regex is more restrictive and explicit about allowed characters
  // Only allows lowercase letters, numbers, dashes, and underscores
  // Length between 8 and 64 characters
  const isValidCallId = /^[a-z0-9\-_]{8,64}$/.test(trimmedId);

  if (!isValidCallId) {
    logger.error(
      'ACTION_POINTS_SECURITY',
      'Invalid callId format detected - potential SSRF attempt',
      new Error(`Rejected callId: ${trimmedId}`),
      {
        callId: trimmedId,
        length: trimmedId.length,
        allowedPattern: 'a-z, 0-9, -, _ (8-64 chars)',
      }
    );
  }

  return isValidCallId;
}

/**
 * Safely constructs a VAPI call URL with validated callId
 * Provides an additional layer of security against SSRF attacks
 *
 * @param callId - The call ID to include in the URL
 * @returns string - The safe URL or throws an error if validation fails
 */
function constructSafeVapiCallUrl(callId: string): string {
  // Validate the callId before using it in URL construction
  if (!validateCallId(callId)) {
    throw new Error(`Invalid callId format: ${callId}`);
  }

  // Construct the URL with explicit validation
  const baseUrl = process.env.VAPI_API_URL || 'https://api.vapi.ai';
  const safeUrl = `${baseUrl}/call/${callId}`;

  // Additional safety check: ensure the URL doesn't contain any suspicious patterns
  if (
    safeUrl.includes('://') &&
    !safeUrl.startsWith('https://api.vapi.ai/') &&
    !safeUrl.startsWith(baseUrl + '/')
  ) {
    throw new Error(`Invalid URL construction detected: ${safeUrl}`);
  }

  return safeUrl;
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

        // Validate callId to prevent SSRF attacks using comprehensive validation
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

        // Fetch fresh call details from VAPI - no caching needed since VAPI is the source of truth

        const vapiResponse = await Sentry.startSpan(
          {
            name: 'fetchVapiCallDetails',
            op: 'http.client',
          },
          async () => {
            // Use safe URL construction to prevent SSRF attacks
            const safeUrl = constructSafeVapiCallUrl(callId);
            return await fetch(safeUrl, {
              headers: {
                Authorization: `Bearer ${process.env.VAPI_PRIVATE_KEY}`,
                Accept: 'application/json',
              },
            });
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
