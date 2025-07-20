import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { CallMetrics, DashboardAnalytics } from '@/lib/types';
import { createClient } from '@/lib/supabase/server';
import { callCache } from '@/lib/call-cache';
import * as Sentry from '@sentry/nextjs';
// Removed Redis dependency - all analysis comes directly from VAPI

/**
 * @swagger
 * /api/vapi/analytics:
 *   get:
 *     summary: Get call analytics data
 *     description: Returns analytics data including metrics, recent calls, and trends
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to include in analytics
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of recent calls to return
 *     responses:
 *       200:
 *         description: Analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 metrics:
 *                   $ref: '#/components/schemas/CallMetrics'
 *                 recentCalls:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CallData'
 *                 trends:
 *                   $ref: '#/components/schemas/Trends'
 *
 * components:
 *   schemas:
 *     CallData:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         phoneNumber:
 *           type: object
 *           properties:
 *             number:
 *               type: string
 *         callerName:
 *           type: string
 *         status:
 *           type: string
 *         endedReason:
 *           type: string
 *         durationSeconds:
 *           type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 *         startedAt:
 *           type: string
 *           format: date-time
 *         endedAt:
 *           type: string
 *           format: date-time
 *         cost:
 *           type: number
 *         transcript:
 *           type: string
 *         summary:
 *           type: string
 *         analysis:
 *           type: object
 *           properties:
 *             sentiment:
 *               type: string
 *               enum: [positive, neutral, negative]
 *               description: Call sentiment analysis result
 *             leadQuality:
 *               type: string
 *               enum: [hot, warm, cold]
 *               description: Lead quality assessment
 */
export async function GET(request: NextRequest) {
  const apiKey = process.env.VAPI_PRIVATE_KEY;
  const baseUrl = process.env.VAPI_API_URL || 'https://api.vapi.ai';

  if (!apiKey) {
    logger.error('ANALYTICS', 'API key not configured');
    return NextResponse.json(
      { error: 'VAPI API key not configured' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30');
  const limit = parseInt(searchParams.get('limit') || '100');

  logger.info('ANALYTICS', 'Analytics API called with time range filter', {
    requestedDays: days,
    requestedLimit: limit,
    timestamp: new Date().toISOString(),
  });

  try {
    // Check cache first for recent requests (reduces VAPI API load)
    const cacheKey = `analytics:${searchParams.toString()}`;
    const cachedData = await Sentry.startSpan(
      {
        name: 'checkAnalyticsCache',
        op: 'cache',
      },
      async () => {
        return callCache.get(cacheKey);
      }
    );

    if (cachedData) {
      logger.info('ANALYTICS', 'Returning cached analytics data', {
        requestedDays: days,
        cacheKey,
      });
      return NextResponse.json(cachedData);
    }

    // Maximum number of calls to fetch from VAPI in a single analytics request.
    // Chosen to balance API performance, avoid missing recent calls, and prevent excessive payloads.
    const VAPI_ANALYTICS_FETCH_LIMIT = 500;
    const adjustedLimit = Math.max(limit, VAPI_ANALYTICS_FETCH_LIMIT); // Use consistent high limit

    const url = new URL('/call', baseUrl);
    url.searchParams.set('limit', adjustedLimit.toString());

    // Add date filtering to VAPI request if we're looking for a shorter range
    if (days <= 30) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      // Note: VAPI might support createdAfter parameter - check their docs
      // url.searchParams.set('createdAfter', cutoffDate.toISOString());
    }

    const res = await Sentry.startSpan(
      {
        name: 'fetchVapiCalls',
        op: 'http.client',
      },
      async () => {
        return await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
            'User-Agent': 'spoqen-dashboard/1.0',
          },
          signal: AbortSignal.timeout(15000),
        });
      }
    );

    if (!res.ok) {
      logger.error('ANALYTICS', 'VAPI API error', undefined, {
        status: res.status,
        statusText: res.statusText,
      });
      return NextResponse.json(
        { error: 'Failed to fetch analytics data' },
        { status: res.status }
      );
    }

    const callsData = await res.json();
    const calls = Array.isArray(callsData) ? callsData : [];

    // Debug: Log all call IDs from VAPI for this request
    logger.info('ANALYTICS', 'All calls from VAPI', {
      daysFilter: days,
      totalCallsFromVAPI: calls.length,
      callIds: calls.map(c => c.id).slice(0, 10), // First 10 call IDs
    });

    // Filter calls by date range
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const filteredCalls = calls.filter(call => {
      const callDate = new Date(call.createdAt || call.startedAt);
      return callDate >= cutoffDate;
    });

    // Debug: Log date-filtered call IDs
    logger.info('ANALYTICS', 'Date-filtered calls', {
      daysFilter: days,
      cutoffDate: cutoffDate.toISOString(),
      dateFilteredCount: filteredCalls.length,
      dateFilteredCallIds: filteredCalls.map(c => c.id),
    });

    // Get authenticated user and their assistant ID in a single optimized query
    const supabase = await Sentry.startSpan(
      {
        name: 'createSupabaseClient',
        op: 'db',
      },
      async () => {
        return await createClient();
      }
    );

    const {
      data: { user },
    } = await Sentry.startSpan(
      {
        name: 'getAuthenticatedUser',
        op: 'auth',
      },
      async () => {
        return await supabase.auth.getUser();
      }
    );

    let userAssistantId: string | null = null;
    if (user) {
      // Optimized query with proper error handling and caching hint
      const { data: userSettings, error: settingsError } = await supabase
        .from('user_settings')
        .select('vapi_assistant_id')
        .eq('id', user.id)
        .single();

      if (settingsError) {
        logger.error(
          'ANALYTICS',
          'Failed to fetch user settings',
          settingsError
        );
        // Continue with null assistant ID rather than failing completely
      }

      userAssistantId = userSettings?.vapi_assistant_id || null;
    }

    // Filter calls to only include those from the user's assistant
    const userFilteredCalls = userAssistantId
      ? filteredCalls.filter(call => call.assistantId === userAssistantId)
      : [];

    // Debug: Log user-filtered call IDs
    logger.info('ANALYTICS', 'User-filtered calls', {
      daysFilter: days,
      userAssistantId,
      userFilteredCount: userFilteredCalls.length,
      userFilteredCallIds: userFilteredCalls.map(c => c.id),
    });

    logger.info(
      'ANALYTICS',
      'Filtering calls by user assistant and date range',
      {
        daysFilter: days,
        adjustedLimit: adjustedLimit,
        cutoffDate: cutoffDate.toISOString(),
        totalCallsFromVAPI: calls.length,
        dateFilteredCalls: filteredCalls.length,
        userAssistantId,
        userFilteredCalls: userFilteredCalls.length,
      }
    );

    // Debug: Log sample call structure to understand what VAPI provides
    if (userFilteredCalls.length > 0) {
      const sampleCall = userFilteredCalls[0];
      logger.info('ANALYTICS', 'Sample VAPI call structure', {
        sampleCallId: sampleCall.id,
        availableFields: Object.keys(sampleCall),
        status: sampleCall.status,
        endedReason: sampleCall.endedReason,
        hasAnalysis: !!sampleCall.analysis,
        analysisFields: sampleCall.analysis
          ? Object.keys(sampleCall.analysis)
          : null,
        hasSuccessEvaluation: !!sampleCall.analysis?.successEvaluation,
        successEvaluation: sampleCall.analysis?.successEvaluation,
        durationSeconds: sampleCall.durationSeconds,
        startedAt: sampleCall.startedAt,
        endedAt: sampleCall.endedAt,
      });

      // Show all unique status and endedReason values
      const allStatuses = [
        ...new Set(userFilteredCalls.map(call => call.status).filter(Boolean)),
      ];
      const allEndedReasons = [
        ...new Set(
          userFilteredCalls.map(call => call.endedReason).filter(Boolean)
        ),
      ];

      logger.info('ANALYTICS', 'All unique call statuses and reasons', {
        uniqueStatuses: allStatuses,
        uniqueEndedReasons: allEndedReasons,
        totalCalls: userFilteredCalls.length,
      });
    }

    // Map ALL calls to frontend format and sort newest first to ensure we capture the most recent calls
    // This prevents scenarios where the VAPI API returns calls in an unexpected order and newer calls get truncated when slicing.
    const mappedUserCalls = userFilteredCalls
      .map(mapVapiCallToFrontend)
      .map(call => ({
        ...call,
        _sortTimestamp: new Date(call.createdAt).getTime(), // Precompute timestamp for efficient sorting
      }))
      .sort((a, b) => b._sortTimestamp - a._sortTimestamp) // Use precomputed timestamps
      .map(({ _sortTimestamp, ...call }) => call); // Remove the temporary sorting field

    // Get recent calls for display (already mapped and date-filtered)
    // All analysis data comes directly from VAPI - no additional enrichment needed
    const recentCalls = mappedUserCalls.slice(0, 100);

    logger.info('ANALYTICS', 'Using VAPI analysis data directly', {
      totalCalls: recentCalls.length,
      callsWithSentiment: recentCalls.filter(c => c.analysis?.sentiment).length,
      callsWithLeadQuality: recentCalls.filter(c => c.analysis?.leadQuality)
        .length,
      callsWithStructuredData: recentCalls.filter(
        c => c.analysis?.structuredData
      ).length,
    });

    // Calculate metrics with real sentiment data (using properly mapped calls)
    const metrics = await calculateMetrics(
      mappedUserCalls,
      user?.id,
      supabase,
      days
    );
    const trends = calculateTrends(mappedUserCalls, days);

    // Add specific logging to verify filtering is working
    if (userFilteredCalls.length > 0) {
      const callDates = userFilteredCalls.map(
        call => call.createdAt || call.startedAt
      );
      const oldestCall = new Date(
        Math.min(...callDates.map(d => new Date(d).getTime()))
      );
      const newestCall = new Date(
        Math.max(...callDates.map(d => new Date(d).getTime()))
      );

      logger.info('ANALYTICS', 'Call date range verification', {
        requestedDays: days,
        cutoffDate: cutoffDate.toISOString(),
        oldestCallDate: oldestCall.toISOString(),
        newestCallDate: newestCall.toISOString(),
        totalFilteredCalls: userFilteredCalls.length,
        daysSinceOldest: Math.floor(
          (Date.now() - oldestCall.getTime()) / (1000 * 60 * 60 * 24)
        ),
      });
    }

    const analytics: DashboardAnalytics = {
      metrics,
      recentCalls,
      trends,
    };

    // Cache the result for longer since webhooks invalidate when new calls arrive
    // Pure event-driven system allows longer cache without staleness concerns
    const resultCacheKey = `analytics:${searchParams.toString()}`;
    const cacheTtl = days <= 7 ? 1800000 : days <= 30 ? 3600000 : 7200000; // 30min-2hours
    callCache.set(resultCacheKey, analytics, cacheTtl);

    logger.info('ANALYTICS', 'Successfully calculated analytics', {
      totalCalls: metrics.totalCalls,
      timeRange: `${days} days`,
      recentCallsCount: recentCalls.length,
      cutoffDate: cutoffDate.toISOString(),
      cached: true,
      cacheTtlMs: cacheTtl,
    });

    // Calculate appropriate cache duration based on time range
    // Shorter time ranges need more frequent updates, longer ranges can cache longer
    let cacheMaxAge: number;
    if (days <= 7) {
      cacheMaxAge = 120; // 2 minutes for recent data
    } else if (days <= 30) {
      cacheMaxAge = 300; // 5 minutes for medium-term data
    } else {
      cacheMaxAge = 600; // 10 minutes for historical data
    }

    // Create response with caching headers
    const response = NextResponse.json(analytics);

    // HTTP caching headers for better performance
    response.headers.set(
      'Cache-Control',
      `public, max-age=${cacheMaxAge}, stale-while-revalidate=${cacheMaxAge * 2}`
    );
    response.headers.set(
      'ETag',
      `"analytics-${user?.id || 'anon'}-${days}-${Date.now().toString(36)}"`
    );
    response.headers.set('Vary', 'Authorization');

    // Performance monitoring header
    response.headers.set('X-Cache-Duration', `${cacheMaxAge}s`);

    return response;
  } catch (error) {
    logger.error('ANALYTICS', 'Analytics calculation failed', error as Error);
    return NextResponse.json(
      { error: 'Error calculating analytics' },
      { status: 500 }
    );
  }
}

async function calculateMetrics(
  calls: any[],
  userId?: string,
  supabase?: any,
  days?: number
): Promise<CallMetrics> {
  const totalCalls = calls.length;

  // Use VAPI's actual success indicators in the correct priority order
  const answeredCallsData = calls.filter(call => {
    let evaluationPath = '';
    let result = false;

    // PRIORITY 1: Use VAPI's AI-powered success evaluation if available
    if (call.analysis?.successEvaluation !== undefined) {
      const success = call.analysis.successEvaluation;
      evaluationPath += `successEval:${success} `;

      // Handle different rubric types that VAPI might use
      if (typeof success === 'boolean') {
        result = success;
        evaluationPath += `-> ${result ? 'SUCCESS' : 'FAILED'}_BY_AI_ANALYSIS `;
      } else if (typeof success === 'string') {
        // Handle string boolean values
        const successLower = success.toLowerCase();
        if (
          successLower === 'true' ||
          successLower === 'pass' ||
          successLower === 'successful'
        ) {
          result = true;
          evaluationPath += '-> SUCCESS_BY_AI_ANALYSIS ';
        } else if (
          successLower === 'false' ||
          successLower === 'fail' ||
          successLower === 'failed'
        ) {
          result = false;
          evaluationPath += '-> FAILED_BY_AI_ANALYSIS ';
        } else {
          // For numeric strings or other values, continue to next check
          evaluationPath += '-> UNCLEAR_AI_ANALYSIS, ';
        }
      } else if (typeof success === 'number') {
        // For numeric scales, use reasonable thresholds
        if (success >= 7) {
          // Assuming 1-10 scale, 7+ is success
          result = true;
          evaluationPath += '-> SUCCESS_BY_AI_ANALYSIS ';
        } else {
          result = false;
          evaluationPath += '-> FAILED_BY_AI_ANALYSIS ';
        }
      }

      // If we got a clear result from AI analysis, use it
      if (
        evaluationPath.includes('SUCCESS_BY_AI_ANALYSIS') ||
        evaluationPath.includes('FAILED_BY_AI_ANALYSIS')
      ) {
        if (result === false) {
          logger.info('ANALYTICS', 'Call marked failed by VAPI AI analysis', {
            callId: call.id,
            successEvaluation: success,
            endedReason: call.endedReason,
            durationSeconds: call.durationSeconds,
            evaluationPath,
          });
        }
        return result;
      }
    }

    // PRIORITY 2: Check endedReason for specific failure indicators
    if (call.endedReason) {
      const endedReason = call.endedReason.toLowerCase();
      evaluationPath += `endedReason:${endedReason} `;

      // Known failure reasons
      if (
        [
          'silence-timed-out',
          'silence timed out',
          'assistant-error',
          'no-answer',
          'customer-did-not-give-microphone-permission',
        ].includes(endedReason)
      ) {
        result = false;
        evaluationPath += '-> FAILED_BY_ENDED_REASON ';

        logger.info('ANALYTICS', 'Call marked failed by endedReason', {
          callId: call.id,
          status: call.status,
          endedReason: call.endedReason,
          durationSeconds: call.durationSeconds,
          evaluationPath,
        });
        return false;
      }

      // Known success reasons
      if (
        ['customer-ended-call', 'assistant-ended-call'].includes(endedReason)
      ) {
        result = true;
        evaluationPath += '-> SUCCESS_BY_ENDED_REASON ';
        return true;
      }
    }

    // PRIORITY 3: Check status for explicit failure indicators (but NOT 'ended')
    if (call.status) {
      const status = call.status.toLowerCase();
      evaluationPath += `status:${status} `;

      // Standard telephony failure statuses
      if (
        ['failed', 'busy', 'no-answer', 'cancelled', 'timeout'].includes(status)
      ) {
        result = false;
        evaluationPath += '-> FAILED_BY_STATUS ';

        logger.info('ANALYTICS', 'Call marked failed by status', {
          callId: call.id,
          status: call.status,
          endedReason: call.endedReason,
          durationSeconds: call.durationSeconds,
          evaluationPath,
        });
        return false;
      }

      // Only mark explicit success statuses as successful
      if (['completed', 'answered'].includes(status)) {
        result = true;
        evaluationPath += '-> SUCCESS_BY_STATUS ';
        return true;
      }

      // NOTE: 'ended' is NOT considered a success indicator - it just means "finished"
    }

    // FALLBACK: Use duration as last resort (but be more conservative)
    const duration = call.durationSeconds || 0;
    evaluationPath += `duration:${duration}s `;

    if (duration >= 5) {
      // Require at least 5 seconds for success
      result = true;
      evaluationPath += '-> SUCCESS_BY_DURATION_FALLBACK ';
      return true;
    } else {
      result = false;
      evaluationPath += '-> FAILED_BY_DURATION_FALLBACK ';

      logger.info('ANALYTICS', 'Call marked failed by duration fallback', {
        callId: call.id,
        status: call.status,
        endedReason: call.endedReason,
        durationSeconds: call.durationSeconds,
        evaluationPath,
      });
      return false;
    }
  });

  const answeredCalls = answeredCallsData.length;
  const missedCalls = totalCalls - answeredCalls;

  // Calculate total duration from only the successful calls
  const totalDuration = answeredCallsData.reduce(
    (sum, call) => sum + (call.durationSeconds || 0),
    0
  );
  const avgDuration = answeredCalls > 0 ? totalDuration / answeredCalls : 0;

  const totalCost = calls.reduce((sum, call) => sum + (call.cost || 0), 0);
  const avgCost = totalCalls > 0 ? totalCost / totalCalls : 0;

  // Log success evaluation analysis for debugging (updated for new priority system)
  const analysisBreakdown = {
    totalCalls: calls.length,
    successfulCalls: answeredCalls,
    failedCalls: totalCalls - answeredCalls,

    // Count calls with VAPI AI analysis
    callsWithAIAnalysis: calls.filter(
      call => call.analysis?.successEvaluation !== undefined
    ).length,
    aiAnalysisSuccessful: calls.filter(call => {
      const success = call.analysis?.successEvaluation;
      if (success === undefined) return false;

      if (typeof success === 'boolean') return success;
      if (typeof success === 'string') {
        const successLower = success.toLowerCase();
        return (
          successLower === 'true' ||
          successLower === 'pass' ||
          successLower === 'successful'
        );
      }
      if (typeof success === 'number') return success >= 7;
      return false;
    }).length,

    // Count by endedReason evaluation
    successByEndedReason: calls.filter(call => {
      if (!call.endedReason) return false;
      const endedReason = call.endedReason.toLowerCase();
      return ['customer-ended-call', 'assistant-ended-call'].includes(
        endedReason
      );
    }).length,
    failedByEndedReason: calls.filter(call => {
      if (!call.endedReason) return false;
      const endedReason = call.endedReason.toLowerCase();
      return [
        'silence-timed-out',
        'silence timed out',
        'assistant-error',
        'no-answer',
        'customer-did-not-give-microphone-permission',
      ].includes(endedReason);
    }).length,

    // Count by status evaluation (excluding 'ended' which is not a success indicator)
    explicitSuccessStatuses: calls.filter(call => {
      if (!call.status) return false;
      const status = call.status.toLowerCase();
      return ['completed', 'answered'].includes(status);
    }).length,
    explicitFailureStatuses: calls.filter(call => {
      if (!call.status) return false;
      const status = call.status.toLowerCase();
      return ['failed', 'busy', 'no-answer', 'cancelled', 'timeout'].includes(
        status
      );
    }).length,

    // Count duration fallbacks
    durationFallbacks: calls.filter(call => {
      // This call would fall through to duration evaluation
      const hasAIAnalysis = call.analysis?.successEvaluation !== undefined;
      const hasEndedReason =
        call.endedReason &&
        [
          'customer-ended-call',
          'assistant-ended-call',
          'silence-timed-out',
          'silence timed out',
          'assistant-error',
          'no-answer',
          'customer-did-not-give-microphone-permission',
        ].includes(call.endedReason.toLowerCase());
      const hasExplicitStatus =
        call.status &&
        [
          'completed',
          'answered',
          'failed',
          'busy',
          'no-answer',
          'cancelled',
          'timeout',
        ].includes(call.status.toLowerCase());

      return !hasAIAnalysis && !hasEndedReason && !hasExplicitStatus;
    }).length,
  };

  logger.info(
    'ANALYTICS',
    'Call success evaluation breakdown',
    analysisBreakdown
  );

  // Calls by hour (0-23)
  const callsByHour = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: calls.filter(call => {
      const callHour = new Date(call.createdAt || call.startedAt).getHours();
      return callHour === hour;
    }).length,
  }));

  // Calls by day of week
  const dayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  const callsByDay = dayNames.map(day => ({
    day,
    count: calls.filter(call => {
      const dayOfWeek = new Date(call.createdAt || call.startedAt).getDay();
      return dayNames[dayOfWeek] === day;
    }).length,
  }));

  // Calculate sentiment and lead quality distributions directly from VAPI analysis data
  const sentimentDistribution = {
    positive: calls.filter(
      call =>
        call.analysis?.structuredData?.sentiment === 'positive' ||
        call.analysis?.sentiment === 'positive'
    ).length,
    neutral: calls.filter(
      call =>
        call.analysis?.structuredData?.sentiment === 'neutral' ||
        call.analysis?.sentiment === 'neutral'
    ).length,
    negative: calls.filter(
      call =>
        call.analysis?.structuredData?.sentiment === 'negative' ||
        call.analysis?.sentiment === 'negative'
    ).length,
  };

  const leadQualityDistribution = {
    hot: calls.filter(
      call =>
        call.analysis?.structuredData?.leadQuality === 'hot' ||
        call.analysis?.leadQuality === 'hot'
    ).length,
    warm: calls.filter(
      call =>
        call.analysis?.structuredData?.leadQuality === 'warm' ||
        call.analysis?.leadQuality === 'warm'
    ).length,
    cold: calls.filter(
      call =>
        call.analysis?.structuredData?.leadQuality === 'cold' ||
        call.analysis?.leadQuality === 'cold'
    ).length,
  };

  logger.info('ANALYTICS', 'Using VAPI analysis data for distributions', {
    totalCalls: calls.length,
    sentimentDistribution,
    leadQualityDistribution,
    callsWithSentimentAnalysis: calls.filter(
      call =>
        call.analysis?.structuredData?.sentiment || call.analysis?.sentiment
    ).length,
    callsWithLeadQualityAnalysis: calls.filter(
      call =>
        call.analysis?.structuredData?.leadQuality || call.analysis?.leadQuality
    ).length,
  });

  return {
    totalCalls,
    answeredCalls,
    missedCalls,
    avgDuration,
    totalCost,
    avgCost,
    callsByHour,
    callsByDay,
    sentimentDistribution,
    leadQualityDistribution,
  };
}

function calculateTrends(
  calls: any[],
  days: number
): DashboardAnalytics['trends'] {
  if (calls.length === 0) {
    return {
      callVolumeTrend: 'stable',
      avgDurationTrend: 'stable',
      costTrend: 'stable',
    };
  }

  const midpoint = new Date();
  midpoint.setDate(midpoint.getDate() - Math.floor(days / 2));

  const recentCalls = calls.filter(
    call => new Date(call.createdAt || call.startedAt) >= midpoint
  );
  const olderCalls = calls.filter(
    call => new Date(call.createdAt || call.startedAt) < midpoint
  );

  const recentVolume = recentCalls.length;
  const olderVolume = olderCalls.length;

  // Use the same VAPI success evaluation logic as the main metrics
  const isCallSuccessful = (call: any) => {
    // PRIORITY 1: Use VAPI's AI-powered success evaluation if available
    if (call.analysis?.successEvaluation !== undefined) {
      const success = call.analysis.successEvaluation;

      if (typeof success === 'boolean') {
        return success;
      } else if (typeof success === 'string') {
        const successLower = success.toLowerCase();
        if (
          successLower === 'true' ||
          successLower === 'pass' ||
          successLower === 'successful'
        ) {
          return true;
        } else if (
          successLower === 'false' ||
          successLower === 'fail' ||
          successLower === 'failed'
        ) {
          return false;
        }
      } else if (typeof success === 'number') {
        return success >= 7; // Assuming 1-10 scale, 7+ is success
      }
    }

    // PRIORITY 2: Check endedReason for specific failure indicators
    if (call.endedReason) {
      const endedReason = call.endedReason.toLowerCase();

      // Known failure reasons
      if (
        [
          'silence-timed-out',
          'silence timed out',
          'assistant-error',
          'no-answer',
          'customer-did-not-give-microphone-permission',
        ].includes(endedReason)
      ) {
        return false;
      }

      // Known success reasons
      if (
        ['customer-ended-call', 'assistant-ended-call'].includes(endedReason)
      ) {
        return true;
      }
    }

    // PRIORITY 3: Check status for explicit indicators (but NOT 'ended')
    if (call.status) {
      const status = call.status.toLowerCase();

      // Standard telephony failure statuses
      if (
        ['failed', 'busy', 'no-answer', 'cancelled', 'timeout'].includes(status)
      ) {
        return false;
      }

      // Only explicit success statuses
      if (['completed', 'answered'].includes(status)) {
        return true;
      }
    }

    // FALLBACK: Use duration (conservative approach)
    return (call.durationSeconds || 0) >= 5;
  };

  const recentAnsweredCalls = recentCalls.filter(isCallSuccessful);
  const olderAnsweredCalls = olderCalls.filter(isCallSuccessful);

  const recentAvgDuration =
    recentAnsweredCalls.length > 0
      ? recentAnsweredCalls.reduce(
          (sum, call) => sum + (call.durationSeconds || 0),
          0
        ) / recentAnsweredCalls.length
      : 0;
  const olderAvgDuration =
    olderAnsweredCalls.length > 0
      ? olderAnsweredCalls.reduce(
          (sum, call) => sum + (call.durationSeconds || 0),
          0
        ) / olderAnsweredCalls.length
      : 0;

  const recentCost = recentCalls.reduce(
    (sum, call) => sum + (call.cost || 0),
    0
  );
  const olderCost = olderCalls.reduce((sum, call) => sum + (call.cost || 0), 0);

  return {
    callVolumeTrend:
      recentVolume > olderVolume
        ? 'up'
        : recentVolume < olderVolume
          ? 'down'
          : 'stable',
    avgDurationTrend:
      recentAvgDuration > olderAvgDuration
        ? 'up'
        : recentAvgDuration < olderAvgDuration
          ? 'down'
          : 'stable',
    costTrend:
      recentCost > olderCost
        ? 'up'
        : recentCost < olderCost
          ? 'down'
          : 'stable',
  };
}

/**
 * Maps a VAPI call object to the frontend CallData format
 * Ensures sentiment and leadQuality are properly nested under analysis object
 *
 * @param vapiCall - Raw call data from VAPI API
 * @returns CallData object with standardized structure
 */
function mapVapiCallToFrontend(vapiCall: any) {
  const phoneNumber = {
    number:
      vapiCall.customer?.number ||
      vapiCall.destination?.number ||
      vapiCall.phoneNumber?.number,
  };

  const durationSeconds =
    vapiCall.endedAt && vapiCall.startedAt
      ? Math.round(
          (new Date(vapiCall.endedAt).getTime() -
            new Date(vapiCall.startedAt).getTime()) /
            1000
        )
      : 0;

  const status = vapiCall.status || 'unknown';
  const endedReason =
    vapiCall.endedReason ||
    (durationSeconds > 0 ? 'customer-ended-call' : 'no-answer');

  const transcript =
    vapiCall.messages
      ?.map((msg: any) => `${msg.role}: ${msg.message}`)
      .join('\n') || undefined;

  // Extract all analysis data from VAPI's analysis
  const analysis = vapiCall.analysis || {};
  const structuredData = analysis.structuredData || {};

  return {
    id: vapiCall.id,
    phoneNumber,
    callerName: vapiCall.customer?.name,
    status,
    endedReason,
    durationSeconds,
    createdAt:
      vapiCall.createdAt || vapiCall.startedAt || new Date().toISOString(),
    startedAt: vapiCall.startedAt,
    endedAt: vapiCall.endedAt,
    cost: vapiCall.cost,
    transcript,
    summary: analysis.summary,
    // Complete VAPI analysis structure with all fields
    analysis: {
      summary: analysis.summary,
      sentiment: (structuredData.sentiment || analysis.sentiment) as
        | 'positive'
        | 'neutral'
        | 'negative'
        | undefined,
      leadQuality: (structuredData.leadQuality || analysis.leadQuality) as
        | 'hot'
        | 'warm'
        | 'cold'
        | undefined,
      successEvaluation: analysis.successEvaluation,
      structuredData: {
        sentiment: structuredData.sentiment,
        leadQuality: structuredData.leadQuality,
        callPurpose: structuredData.callPurpose,
        keyPoints: structuredData.keyPoints,
        followUpItems: structuredData.followUpItems,
        urgentConcerns: structuredData.urgentConcerns,
        appointmentRequested: structuredData.appointmentRequested,
        timeline: structuredData.timeline,
        contactPreference: structuredData.contactPreference,
        businessInterest: structuredData.businessInterest,
        ...structuredData, // Include any additional VAPI fields
      },
    },
  };
}
