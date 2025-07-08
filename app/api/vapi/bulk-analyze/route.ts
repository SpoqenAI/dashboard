import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

interface BulkAnalyzeRequest {
  limit?: number; // Max number of calls to analyze in one batch
  skipExisting?: boolean; // Skip calls that already have analysis
}

export async function POST(request: NextRequest) {
  try {
    const { limit = 100 } = await request.json();

    logger.info('BULK_ANALYZE', 'Starting bulk analysis', { limit });

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.error(
        'BULK_ANALYZE',
        'Authentication failed',
        userError || new Error('No user')
      );
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the user's VAPI assistant ID
    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('vapi_assistant_id')
      .eq('id', user.id)
      .single();

    if (settingsError) {
      logger.error(
        'BULK_ANALYZE',
        'Failed to fetch user settings',
        settingsError
      );
      return NextResponse.json(
        { error: 'Failed to fetch user settings' },
        { status: 500 }
      );
    }

    const userAssistantId = userSettings?.vapi_assistant_id;
    if (!userAssistantId) {
      logger.warn('BULK_ANALYZE', 'No assistant configured for user', {
        userId: user.id,
      });
      return NextResponse.json(
        { error: 'No assistant configured for user' },
        { status: 400 }
      );
    }

    logger.info('BULK_ANALYZE', 'Found user assistant', { userAssistantId });

    const apiKey = process.env.VAPI_PRIVATE_KEY;
    const baseUrl = process.env.VAPI_API_URL || 'https://api.vapi.ai';

    if (!apiKey) {
      logger.error('BULK_ANALYZE', 'VAPI API key not configured');
      return NextResponse.json(
        { error: 'VAPI API key not configured' },
        { status: 500 }
      );
    }

    // Fetch calls from VAPI - use same limit as analytics API
    const fetchLimit = Math.max(limit * 3, 100);
    const vapiUrl = `${baseUrl}/call?limit=${fetchLimit}`;

    logger.info('BULK_ANALYZE', 'Fetching calls from VAPI', {
      vapiUrl,
      fetchLimit,
    });

    const vapiResponse = await fetch(vapiUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'User-Agent': 'spoqen-dashboard/1.0',
      },
    });

    if (!vapiResponse.ok) {
      logger.error('BULK_ANALYZE', 'VAPI API request failed', undefined, {
        status: vapiResponse.status,
        statusText: vapiResponse.statusText,
      });
      return NextResponse.json(
        { error: 'Failed to fetch calls' },
        { status: vapiResponse.status }
      );
    }

    const callsData = await vapiResponse.json();
    const calls = Array.isArray(callsData) ? callsData : [];
    logger.info('BULK_ANALYZE', 'Fetched calls from VAPI', {
      totalCalls: calls.length,
    });

    // Apply same date filtering as analytics API (30 days)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    const dateFilteredCalls = calls.filter(call => {
      const callDate = new Date(call.createdAt || call.startedAt);
      return callDate >= cutoffDate;
    });

    // Filter calls for this user's assistant (match analytics API logic)
    const userCalls = dateFilteredCalls.filter((call: any) => {
      return call.assistantId === userAssistantId;
    });

    // Debug: Log some sample calls to understand their structure
    if (userCalls.length > 0) {
      const sampleCall = userCalls[0];
      logger.info('BULK_ANALYZE', 'Sample call structure', {
        sampleCall: {
          id: sampleCall.id,
          durationSeconds: sampleCall.durationSeconds,
          endedReason: sampleCall.endedReason,
          hasTranscript: !!sampleCall.transcript,
          hasSummary: !!sampleCall.summary,
          hasMessages: !!sampleCall.messages,
          hasAnalysis: !!sampleCall.analysis,
          hasAnalysisStructuredData: !!sampleCall.analysis?.structuredData,
          analysisFields: sampleCall.analysis ? Object.keys(sampleCall.analysis) : null,
          transcriptLength: sampleCall.transcript?.length || 0,
          summaryLength: sampleCall.summary?.length || 0,
          messagesCount: sampleCall.messages?.length || 0,
        },
      });
    }

    // Use the EXACT same filtering logic as analytics API
    // Analytics counts ALL user calls, so we should process ALL user calls
    const answeredCalls = userCalls.filter((call: any) => {
      // Include all calls that have any content to analyze OR have VAPI analysis
      const hasTranscript = call.transcript && call.transcript.trim();
      const hasSummary = call.summary && call.summary.trim();
      const hasMessages = call.messages && call.messages.length > 0;
      const hasVapiAnalysis = call.analysis && (call.analysis.summary || call.analysis.structuredData);
      const hasContent = hasTranscript || hasSummary || hasMessages || hasVapiAnalysis;

      if (hasContent) {
        return true;
      }

      // Also include calls that might have content when fetched individually
      return true; // We'll filter in the processing loop
    });

    logger.info('BULK_ANALYZE', 'Filtered calls', {
      totalFetched: calls.length,
      dateFiltered: dateFilteredCalls.length,
      userCalls: userCalls.length,
      answeredCalls: answeredCalls.length,
      userAssistantId,
    });

    // ALWAYS get existing analysis to find calls that need processing
    const { data: existing } = await supabase
      .from('call_analysis')
      .select('vapi_call_id')
      .eq('user_id', user.id);

    const existingAnalysis = existing?.map(row => row.vapi_call_id) || [];
    logger.info('BULK_ANALYZE', 'Found existing analysis', {
      existingCount: existingAnalysis.length,
      existingCallIds: existingAnalysis.slice(0, 5), // Show first 5 for debugging
    });

    // Process calls that DON'T have analysis yet (this is the key fix!)
    const callsNeedingAnalysis = answeredCalls.filter((call: any) => {
      const needsAnalysis = !existingAnalysis.includes(call.id);
      if (!needsAnalysis) {
        logger.info('BULK_ANALYZE', 'Skipping call with existing analysis', {
          callId: call.id,
        });
      }
      return needsAnalysis;
    });

    const callsToProcess = callsNeedingAnalysis.slice(0, limit);

    logger.info('BULK_ANALYZE', 'Calls to process', {
      totalAnsweredCalls: answeredCalls.length,
      callsNeedingAnalysis: callsNeedingAnalysis.length,
      callsToProcess: callsToProcess.length,
      limit,
    });

    let processed = 0;
    let errors = 0;

    for (const call of callsToProcess) {
      try {
        // Check if we need to fetch detailed call info
        let detailedCall = call;
        
        // If no VAPI analysis in the basic call data, try to fetch detailed call info
        if (!call.analysis?.structuredData && !call.analysis?.summary) {
          logger.info(
            'BULK_ANALYZE',
            'No VAPI analysis in call, fetching detailed info',
            { callId: call.id }
          );

          try {
            const detailResponse = await fetch(`${baseUrl}/call/${call.id}`, {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                Accept: 'application/json',
              },
            });

            if (detailResponse.ok) {
              detailedCall = await detailResponse.json();
              
              logger.info('BULK_ANALYZE', 'Fetched detailed call info', {
                callId: call.id,
                hasDetailedAnalysis: !!detailedCall.analysis,
                hasDetailedStructuredData: !!detailedCall.analysis?.structuredData,
                hasDetailedSummary: !!detailedCall.analysis?.summary,
              });
            }
          } catch (fetchError) {
            logger.warn('BULK_ANALYZE', 'Failed to fetch detailed call info', {
              callId: call.id,
              error: fetchError,
            });
          }
        }

        // Extract analysis using VAPI's native data
        const analysisResult = extractAnalysisFromVapiCall(detailedCall);

        logger.info('BULK_ANALYZE', 'Analyzing call with VAPI data', {
          callId: call.id,
          source: analysisResult.source,
          sentiment: analysisResult.sentiment,
          leadQuality: analysisResult.leadQuality,
          callPurpose: analysisResult.callPurpose,
        });

        const { error: insertError } = await supabase
          .from('call_analysis')
          .upsert(
            {
              user_id: user.id,
              vapi_call_id: call.id,
              sentiment: analysisResult.sentiment,
              call_purpose: analysisResult.callPurpose,
              lead_quality: analysisResult.leadQuality,
              key_points: analysisResult.keyPoints,
              follow_up_items: analysisResult.followUpItems,
              urgent_concerns: analysisResult.urgentConcerns,
              property_interest: analysisResult.businessInterest,
              timeline: analysisResult.timeline,
              contact_preference: analysisResult.contactPreference,
              appointment_requested: analysisResult.appointmentRequested,
              analyzed_at: new Date().toISOString(),
            },
            {
              onConflict: 'vapi_call_id',
            }
          );

        if (insertError) {
          logger.error('BULK_ANALYZE', 'Failed to save analysis', insertError, {
            callId: call.id,
          });
          errors++;
        } else {
          processed++;
          logger.info('BULK_ANALYZE', 'Successfully saved analysis', {
            callId: call.id,
            processed,
          });
        }
      } catch (callError) {
        logger.error(
          'BULK_ANALYZE',
          'Error processing call',
          callError as Error,
          {
            callId: call.id,
          }
        );
        errors++;
      }
    }

    logger.info('BULK_ANALYZE', 'Bulk analysis completed', {
      processed,
      errors,
      totalRequested: limit,
    });

    return NextResponse.json({
      processed,
      errors,
      totalAvailable: answeredCalls.length,
      alreadyAnalyzed: existingAnalysis.length,
    });
  } catch (error) {
    logger.error('BULK_ANALYZE', 'Bulk analysis failed', error as Error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * Extract analysis from VAPI call using native analysis data
 * This replaces all the hardcoded real estate functions
 */
function extractAnalysisFromVapiCall(call: any) {
  const analysis = call.analysis || {};
  const structuredData = analysis.structuredData || {};
  const summary = analysis.summary || '';
  
  // Fallback content for calls without VAPI analysis
  const fallbackContent = 
    call.transcript ||
    call.messages?.map((m: any) => `${m.role}: ${m.message}`).join('\n') ||
    summary ||
    `Call lasted ${call.durationSeconds || 0} seconds. Ended with reason: ${call.endedReason || 'unknown'}.`;

  let source = 'VAPI_NATIVE_ANALYSIS';
  
  // Try to extract from VAPI's structured data first
  let sentiment = structuredData.sentiment;
  let callPurpose = structuredData.callPurpose || structuredData.purpose;
  let keyPoints = structuredData.keyPoints || structuredData.key_points;
  let followUpItems = structuredData.followUpItems || structuredData.follow_up_items || structuredData.followUp;
  let urgentConcerns = structuredData.urgentConcerns || structuredData.urgent_concerns || structuredData.urgent;
  let leadQuality = structuredData.leadQuality || structuredData.lead_quality;
  let timeline = structuredData.timeline || structuredData.timeframe;
  let contactPreference = structuredData.contactPreference || structuredData.contact_preference || structuredData.preferredContact;
  let appointmentRequested = structuredData.appointmentRequested || structuredData.appointment_requested || structuredData.appointment;
  let businessInterest = structuredData.businessInterest || structuredData.business_interest || structuredData.serviceInterest || structuredData.productInterest;

  // If no structured data, try to extract from summary
  if (!sentiment && summary) {
    sentiment = extractSentimentFromText(summary);
    source = 'VAPI_SUMMARY_ANALYSIS';
  }
  
  if (!callPurpose && summary) {
    callPurpose = extractCallPurposeFromText(summary);
    source = source.includes('SUMMARY') ? source : 'VAPI_SUMMARY_ANALYSIS';
  }
  
  if (!keyPoints && summary) {
    keyPoints = extractKeyPointsFromText(summary);
    source = source.includes('SUMMARY') ? source : 'VAPI_SUMMARY_ANALYSIS';
  }

  // If still no data, fallback to basic content analysis
  if (!sentiment) {
    sentiment = extractSentimentFromText(fallbackContent);
    source = 'FALLBACK_CONTENT_ANALYSIS';
  }
  
  if (!callPurpose) {
    callPurpose = extractCallPurposeFromText(fallbackContent);
    source = source.includes('FALLBACK') ? source : 'FALLBACK_CONTENT_ANALYSIS';
  }
  
  if (!keyPoints) {
    keyPoints = extractKeyPointsFromText(fallbackContent);
    source = source.includes('FALLBACK') ? source : 'FALLBACK_CONTENT_ANALYSIS';
  }

  // Set defaults
  sentiment = sentiment || 'neutral';
  callPurpose = callPurpose || 'General inquiry';
  keyPoints = Array.isArray(keyPoints) ? keyPoints : (keyPoints ? [keyPoints] : ['Standard inquiry']);
  followUpItems = Array.isArray(followUpItems) ? followUpItems : (followUpItems ? [followUpItems] : []);
  urgentConcerns = Array.isArray(urgentConcerns) ? urgentConcerns : (urgentConcerns ? [urgentConcerns] : []);
  leadQuality = leadQuality || determineLeadQualityFromContent(summary || fallbackContent, urgentConcerns);
  timeline = timeline || extractTimelineFromText(summary || fallbackContent);
  contactPreference = contactPreference || extractContactPreferenceFromText(summary || fallbackContent);
  appointmentRequested = appointmentRequested !== undefined ? appointmentRequested : 
    (summary || fallbackContent).toLowerCase().includes('appointment') ||
    (summary || fallbackContent).toLowerCase().includes('meeting');
  businessInterest = businessInterest || extractBusinessInterestFromText(summary || fallbackContent);

  return {
    source,
    sentiment: sentiment as 'positive' | 'negative' | 'neutral',
    callPurpose,
    leadQuality: leadQuality as 'hot' | 'warm' | 'cold',
    keyPoints,
    followUpItems,
    urgentConcerns,
    timeline,
    contactPreference,
    appointmentRequested,
    businessInterest,
  };
}

/**
 * Industry-agnostic helper functions for extracting data from text
 * These replace the hardcoded real estate functions
 */

function extractSentimentFromText(content: string): string {
  const lower = content.toLowerCase();
  
  const positiveWords = ['great', 'excellent', 'love', 'perfect', 'amazing', 'wonderful', 'interested', 'excited', 'impressed', 'satisfied', 'happy'];
  const negativeWords = ['terrible', 'awful', 'hate', 'disappointed', 'frustrated', 'angry', 'problem', 'issue', 'complaint', 'dissatisfied'];
  
  const positiveCount = positiveWords.filter(word => lower.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lower.includes(word)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

function extractCallPurposeFromText(content: string): string {
  const lower = content.toLowerCase();
  
  // General business purposes (industry-agnostic)
  if (lower.includes('demo') || lower.includes('demonstration')) return 'Product demo request';
  if (lower.includes('quote') || lower.includes('pricing') || lower.includes('cost')) return 'Pricing inquiry';
  if (lower.includes('support') || lower.includes('help') || lower.includes('issue')) return 'Support request';
  if (lower.includes('partnership') || lower.includes('collaboration')) return 'Partnership inquiry';
  if (lower.includes('investment') || lower.includes('funding')) return 'Investment inquiry';
  if (lower.includes('job') || lower.includes('career') || lower.includes('hiring')) return 'Career inquiry';
  if (lower.includes('integration') || lower.includes('api')) return 'Technical integration';
  if (lower.includes('trial') || lower.includes('test')) return 'Trial request';
  
  return 'General inquiry';
}

function extractKeyPointsFromText(content: string): string[] {
  const points: string[] = [];
  const lower = content.toLowerCase();
  
  // Generic business discussion points
  if (lower.includes('budget') || lower.includes('price') || lower.includes('cost')) {
    points.push('Budget and pricing discussed');
  }
  if (lower.includes('timeline') || lower.includes('when') || lower.includes('schedule')) {
    points.push('Timeline requirements mentioned');
  }
  if (lower.includes('feature') || lower.includes('capability') || lower.includes('functionality')) {
    points.push('Product features discussed');
  }
  if (lower.includes('team') || lower.includes('company') || lower.includes('organization')) {
    points.push('Team or company details shared');
  }
  if (lower.includes('integration') || lower.includes('api') || lower.includes('technical')) {
    points.push('Technical requirements discussed');
  }
  if (lower.includes('security') || lower.includes('compliance') || lower.includes('privacy')) {
    points.push('Security and compliance topics');
  }
  
  return points.length > 0 ? points : ['Standard inquiry'];
}

function extractTimelineFromText(content: string): string {
  const lower = content.toLowerCase();
  
  if (lower.includes('immediately') || lower.includes('asap') || lower.includes('urgent')) {
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
  if (lower.includes('no rush') || lower.includes('just exploring') || lower.includes('research')) {
    return 'No specific timeline';
  }
  
  return 'Not specified';
}

function extractContactPreferenceFromText(content: string): string {
  const lower = content.toLowerCase();
  
  if (lower.includes('email')) return 'Email';
  if (lower.includes('text') || lower.includes('sms')) return 'Text/SMS';
  if (lower.includes('slack') || lower.includes('teams') || lower.includes('discord')) return 'Team chat';
  if (lower.includes('video call') || lower.includes('zoom') || lower.includes('meet')) return 'Video call';
  if (lower.includes('call') || lower.includes('phone')) return 'Phone call';
  
  return 'Phone call'; // Default
}

function extractBusinessInterestFromText(content: string): string {
  const lower = content.toLowerCase();
  
  // Tech/SaaS focused categories (aligned with current target audience)
  if (lower.includes('saas') || lower.includes('software as a service')) return 'SaaS Solution';
  if (lower.includes('api') || lower.includes('integration') || lower.includes('webhook')) return 'API/Integration';
  if (lower.includes('analytics') || lower.includes('data') || lower.includes('reporting')) return 'Analytics/Data';
  if (lower.includes('automation') || lower.includes('workflow') || lower.includes('process')) return 'Automation';
  if (lower.includes('ai') || lower.includes('artificial intelligence') || lower.includes('machine learning')) return 'AI Solution';
  if (lower.includes('marketing') || lower.includes('growth') || lower.includes('lead generation')) return 'Marketing/Growth';
  if (lower.includes('security') || lower.includes('compliance') || lower.includes('privacy')) return 'Security/Compliance';
  if (lower.includes('infrastructure') || lower.includes('hosting') || lower.includes('cloud')) return 'Infrastructure';
  if (lower.includes('crm') || lower.includes('customer management')) return 'CRM/Customer Management';
  if (lower.includes('communication') || lower.includes('chat') || lower.includes('messaging')) return 'Communication Tools';
  
  return 'Not specified';
}

function determineLeadQualityFromContent(content: string, urgentConcerns: string[]): string {
  const lower = content.toLowerCase();
  
  // Hot leads: urgent, budget confirmed, decision maker
  if (
    urgentConcerns.length > 0 ||
    lower.includes('budget approved') ||
    lower.includes('decision maker') ||
    lower.includes('ready to purchase') ||
    lower.includes('need it asap') ||
    lower.includes('urgent')
  ) {
    return 'hot';
  }
  
  // Warm leads: interested, timeline defined, engaged
  if (
    lower.includes('interested') ||
    lower.includes('timeline') ||
    lower.includes('demo') ||
    lower.includes('proposal') ||
    lower.includes('next steps') ||
    lower.includes('trial')
  ) {
    return 'warm';
  }
  
  // Cold leads: just browsing or general inquiry
  return 'cold';
}
