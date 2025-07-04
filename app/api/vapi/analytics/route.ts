import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { CallMetrics, DashboardAnalytics } from '@/lib/types';
import { createClient } from '@/lib/supabase/server';

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
    // Fetch calls from VAPI with adjusted limit based on time range
    // For longer time ranges, we need to fetch more calls to ensure we get all calls within the range
    const adjustedLimit = Math.max(limit, days * 10); // Rough estimate: 10 calls per day max

    const url = new URL('/call', baseUrl);
    url.searchParams.set('limit', adjustedLimit.toString());

    // Add date filtering to VAPI request if we're looking for a shorter range
    if (days <= 30) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      // Note: VAPI might support createdAfter parameter - check their docs
      // url.searchParams.set('createdAfter', cutoffDate.toISOString());
    }

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'User-Agent': 'spoqen-dashboard/1.0',
      },
      signal: AbortSignal.timeout(15000),
    });

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

    // Filter calls by date range
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const filteredCalls = calls.filter(call => {
      const callDate = new Date(call.createdAt || call.startedAt);
      return callDate >= cutoffDate;
    });

    // Get authenticated user and their assistant ID
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let userAssistantId: string | null = null;
    if (user) {
      // Get the user's VAPI assistant ID from user_settings
      const { data: userSettings } = await supabase
        .from('user_settings')
        .select('vapi_assistant_id')
        .eq('id', user.id)
        .single();

      userAssistantId = userSettings?.vapi_assistant_id || null;
    }

    // Filter calls to only include those from the user's assistant
    const userFilteredCalls = userAssistantId
      ? filteredCalls.filter(call => call.assistantId === userAssistantId)
      : [];

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

    // Map ALL calls to frontend format FIRST (this calculates durationSeconds from timestamps)
    const mappedUserCalls = userFilteredCalls.map(mapVapiCallToFrontend);

    // Calculate metrics with real sentiment data (using properly mapped calls)
    const metrics = await calculateMetrics(
      mappedUserCalls,
      user?.id,
      supabase,
      days
    );
    const trends = calculateTrends(mappedUserCalls, days);

    // Get recent calls for display (already mapped and date-filtered)
    // Note: mappedUserCalls are already filtered by date range and user, so we use them directly
    const recentCalls = mappedUserCalls.slice(0, 100);

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

    logger.info('ANALYTICS', 'Successfully calculated analytics', {
      totalCalls: metrics.totalCalls,
      timeRange: `${days} days`,
      recentCallsCount: recentCalls.length,
      cutoffDate: cutoffDate.toISOString(),
    });

    return NextResponse.json(analytics);
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

  // Real sentiment distribution from database
  let sentimentDistribution = {
    positive: 0,
    neutral: 0,
    negative: 0,
  };

  let leadQualityDistribution = {
    hot: 0,
    warm: 0,
    cold: 0,
  };

  // Fetch real sentiment data from database if user is authenticated
  if (userId && supabase) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - (days || 30));

      // Get call IDs from current VAPI data to ensure we only count analysis for existing calls
      const currentVapiCallIds = calls.map(call => call.id);

      const { data: callAnalysisData, error } = await supabase
        .from('call_analysis')
        .select('sentiment, lead_quality, analyzed_at, vapi_call_id')
        .eq('user_id', userId)
        .gte('analyzed_at', cutoffDate.toISOString())
        .in('vapi_call_id', currentVapiCallIds); // Only include analysis for calls still in VAPI

      if (error) {
        logger.error(
          'ANALYTICS',
          'Failed to fetch sentiment data from database',
          error
        );
        // Fall back to proportional estimates based on answered calls
        sentimentDistribution = {
          positive: Math.floor(answeredCalls * 0.6),
          neutral: Math.floor(answeredCalls * 0.3),
          negative: Math.floor(answeredCalls * 0.1),
        };
        leadQualityDistribution = {
          hot: Math.floor(answeredCalls * 0.2),
          warm: Math.floor(answeredCalls * 0.5),
          cold: Math.floor(answeredCalls * 0.3),
        };
      } else {
        // Calculate real sentiment distribution
        sentimentDistribution = {
          positive: callAnalysisData.filter(
            (item: any) => item.sentiment === 'positive'
          ).length,
          neutral: callAnalysisData.filter(
            (item: any) => item.sentiment === 'neutral'
          ).length,
          negative: callAnalysisData.filter(
            (item: any) => item.sentiment === 'negative'
          ).length,
        };

        // Calculate real lead quality distribution
        leadQualityDistribution = {
          hot: callAnalysisData.filter(
            (item: any) => item.lead_quality === 'hot'
          ).length,
          warm: callAnalysisData.filter(
            (item: any) => item.lead_quality === 'warm'
          ).length,
          cold: callAnalysisData.filter(
            (item: any) => item.lead_quality === 'cold'
          ).length,
        };

        logger.info('ANALYTICS', 'Using real sentiment data from database', {
          totalAnalyzedCalls: callAnalysisData.length,
          totalVapiCalls: currentVapiCallIds.length,
          sentimentDistribution,
          leadQualityDistribution,
        });
      }
    } catch (dbError) {
      logger.error(
        'ANALYTICS',
        'Database query failed for sentiment data',
        dbError as Error
      );
      // Fall back to estimates
      sentimentDistribution = {
        positive: Math.floor(answeredCalls * 0.6),
        neutral: Math.floor(answeredCalls * 0.3),
        negative: Math.floor(answeredCalls * 0.1),
      };
      leadQualityDistribution = {
        hot: Math.floor(answeredCalls * 0.2),
        warm: Math.floor(answeredCalls * 0.5),
        cold: Math.floor(answeredCalls * 0.3),
      };
    }
  } else {
    // No user authentication, use estimates
    sentimentDistribution = {
      positive: Math.floor(answeredCalls * 0.6),
      neutral: Math.floor(answeredCalls * 0.3),
      negative: Math.floor(answeredCalls * 0.1),
    };
    leadQualityDistribution = {
      hot: Math.floor(answeredCalls * 0.2),
      warm: Math.floor(answeredCalls * 0.5),
      cold: Math.floor(answeredCalls * 0.3),
    };
  }

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

function mapVapiCallToFrontend(vapiCall: any) {
  const phoneNumber =
    vapiCall.customer?.number ||
    vapiCall.destination?.number ||
    vapiCall.phoneNumber?.number;

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
    summary: vapiCall.analysis?.summary,
  };
}
