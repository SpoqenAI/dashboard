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
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      logger.error('BULK_ANALYZE', 'Authentication failed', userError || new Error('No user'));
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get the user's VAPI assistant ID
    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('vapi_assistant_id')
      .eq('id', user.id)
      .single();
    
    if (settingsError) {
      logger.error('BULK_ANALYZE', 'Failed to fetch user settings', settingsError);
      return NextResponse.json({ error: 'Failed to fetch user settings' }, { status: 500 });
    }
    
    const userAssistantId = userSettings?.vapi_assistant_id;
    if (!userAssistantId) {
      logger.warn('BULK_ANALYZE', 'No assistant configured for user', { userId: user.id });
      return NextResponse.json({ error: 'No assistant configured for user' }, { status: 400 });
    }

    logger.info('BULK_ANALYZE', 'Found user assistant', { userAssistantId });

    const apiKey = process.env.VAPI_PRIVATE_KEY;
    const baseUrl = process.env.VAPI_API_URL || 'https://api.vapi.ai';

    if (!apiKey) {
      logger.error('BULK_ANALYZE', 'VAPI API key not configured');
      return NextResponse.json({ error: 'VAPI API key not configured' }, { status: 500 });
    }

    // Fetch calls from VAPI - use same limit as analytics API
    const fetchLimit = Math.max(limit * 3, 100); // Match analytics API limit
    const vapiUrl = `${baseUrl}/call?limit=${fetchLimit}`;
    
    logger.info('BULK_ANALYZE', 'Fetching calls from VAPI', { vapiUrl, fetchLimit });

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
      return NextResponse.json({ error: 'Failed to fetch calls' }, { status: vapiResponse.status });
    }

    const callsData = await vapiResponse.json();
    const calls = Array.isArray(callsData) ? callsData : [];
    logger.info('BULK_ANALYZE', 'Fetched calls from VAPI', { totalCalls: calls.length });

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
      logger.info('BULK_ANALYZE', 'Sample call structure', {
        sampleCall: {
          id: userCalls[0].id,
          durationSeconds: userCalls[0].durationSeconds,
          endedReason: userCalls[0].endedReason,
          hasTranscript: !!userCalls[0].transcript,
          hasSummary: !!userCalls[0].summary,
          hasMessages: !!userCalls[0].messages,
          transcriptLength: userCalls[0].transcript?.length || 0,
          summaryLength: userCalls[0].summary?.length || 0,
          messagesCount: userCalls[0].messages?.length || 0,
        }
      });
    }

    // Use the EXACT same filtering logic as analytics API
    // Analytics counts ALL user calls (64), so we should process ALL user calls
    const answeredCalls = userCalls.filter((call: any) => {
      // Include all calls that have any content to analyze
      const hasTranscript = call.transcript && call.transcript.trim();
      const hasSummary = call.summary && call.summary.trim();
      const hasMessages = call.messages && call.messages.length > 0;
      const hasContent = hasTranscript || hasSummary || hasMessages;
      
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
      userAssistantId 
    });

    // ALWAYS get existing analysis to find calls that need processing
    const { data: existing } = await supabase
      .from('call_analysis')
      .select('vapi_call_id')
      .eq('user_id', user.id);
    
    const existingAnalysis = existing?.map(row => row.vapi_call_id) || [];
    logger.info('BULK_ANALYZE', 'Found existing analysis', { 
      existingCount: existingAnalysis.length,
      existingCallIds: existingAnalysis.slice(0, 5) // Show first 5 for debugging
    });

    // Process calls that DON'T have analysis yet (this is the key fix!)
    const callsNeedingAnalysis = answeredCalls.filter((call: any) => {
      const needsAnalysis = !existingAnalysis.includes(call.id);
      if (!needsAnalysis) {
        logger.info('BULK_ANALYZE', 'Skipping call with existing analysis', { callId: call.id });
      }
      return needsAnalysis;
    });

    const callsToProcess = callsNeedingAnalysis.slice(0, limit);

    logger.info('BULK_ANALYZE', 'Calls to process', { 
      totalAnsweredCalls: answeredCalls.length,
      callsNeedingAnalysis: callsNeedingAnalysis.length,
      callsToProcess: callsToProcess.length,
      limit 
    });

    let processed = 0;
    let errors = 0;

    for (const call of callsToProcess) {
      try {
        // Get call content for analysis
        let content = call.transcript || 
                     call.messages?.map((m: any) => `${m.role}: ${m.message}`).join('\n') ||
                     call.summary || '';
        
        // If no content in the basic call data, try to fetch detailed call info
        if (!content.trim()) {
          logger.info('BULK_ANALYZE', 'No content in call, fetching detailed info', { callId: call.id });
          
          try {
            const detailResponse = await fetch(`${baseUrl}/call/${call.id}`, {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                Accept: 'application/json',
              },
            });
            
            if (detailResponse.ok) {
              const detailData = await detailResponse.json();
              content = detailData.transcript || 
                       detailData.messages?.map((m: any) => `${m.role}: ${m.message}`).join('\n') ||
                       detailData.summary || '';
              
              logger.info('BULK_ANALYZE', 'Fetched detailed call content', { 
                callId: call.id,
                hasDetailedContent: !!content.trim(),
                contentLength: content.length 
              });
            }
          } catch (fetchError) {
            logger.warn('BULK_ANALYZE', 'Failed to fetch detailed call info', { 
              callId: call.id,
              error: fetchError 
            });
          }
        }
        
        if (!content.trim()) {
          logger.warn('BULK_ANALYZE', 'Call has no content to analyze even after detailed fetch', { 
            callId: call.id,
            durationSeconds: call.durationSeconds,
            endedReason: call.endedReason 
          });
          
          // Create a basic analysis for calls without content
          content = `Call lasted ${call.durationSeconds} seconds. Ended with reason: ${call.endedReason || 'unknown'}.`;
        }

        const sentiment = getSentiment(content);
        const leadQuality = getLeadQuality(content);
        const callPurpose = getCallPurpose(content);
        
        logger.info('BULK_ANALYZE', 'Analyzing call', { 
          callId: call.id,
          sentiment,
          leadQuality,
          callPurpose,
          contentLength: content.length 
        });

        const { error: insertError } = await supabase
          .from('call_analysis')
          .upsert({
            user_id: user.id,
            vapi_call_id: call.id,
            sentiment,
            call_purpose: callPurpose,
            lead_quality: leadQuality,
            key_points: extractKeyPoints(content),
            follow_up_items: extractFollowUpItems(content),
            urgent_concerns: extractUrgentConcerns(content),
            property_interest: extractPropertyInterest(content),
            timeline: extractTimeline(content),
            contact_preference: extractContactPreference(content),
            appointment_requested: content.toLowerCase().includes('appointment') || 
                                 content.toLowerCase().includes('showing'),
            analyzed_at: new Date().toISOString(),
          }, { 
            onConflict: 'vapi_call_id' 
          });

        if (insertError) {
          logger.error('BULK_ANALYZE', 'Failed to save analysis', insertError, { callId: call.id });
          errors++;
        } else {
          processed++;
          logger.info('BULK_ANALYZE', 'Successfully saved analysis', { 
            callId: call.id,
            processed 
          });
        }
      } catch (callError) {
        logger.error('BULK_ANALYZE', 'Error processing call', callError as Error, { 
          callId: call.id 
        });
        errors++;
      }
    }

    logger.info('BULK_ANALYZE', 'Bulk analysis completed', { 
      processed,
      errors,
      totalRequested: limit 
    });

    return NextResponse.json({ 
      processed,
      errors,
      totalAvailable: answeredCalls.length,
      alreadyAnalyzed: existingAnalysis.length 
    });

  } catch (error) {
    logger.error('BULK_ANALYZE', 'Bulk analysis failed', error as Error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

function getSentiment(content: string): 'positive' | 'negative' | 'neutral' {
  const lower = content.toLowerCase();
  const positive = ['great', 'excellent', 'love', 'perfect', 'amazing', 'wonderful', 'interested', 'excited'].some(word => lower.includes(word));
  const negative = ['terrible', 'awful', 'hate', 'problem', 'issue', 'disappointed', 'frustrated', 'angry'].some(word => lower.includes(word));
  
  if (positive && !negative) return 'positive';
  if (negative && !positive) return 'negative';
  return 'neutral';
}

function getLeadQuality(content: string): 'hot' | 'warm' | 'cold' {
  const lower = content.toLowerCase();
  
  // Hot leads: urgent, ready to move
  if (lower.includes('urgent') || lower.includes('asap') || lower.includes('immediately') || 
      lower.includes('cash buyer') || lower.includes('pre-approved')) {
    return 'hot';
  }
  
  // Warm leads: interested but not urgent
  if (lower.includes('interested') || lower.includes('looking') || lower.includes('considering') ||
      lower.includes('appointment') || lower.includes('showing') || lower.includes('visit')) {
    return 'warm';
  }
  
  // Cold leads: just browsing or general inquiry
  return 'cold';
}

function getCallPurpose(content: string): string {
  const lower = content.toLowerCase();
  
  if (lower.includes('buy') || lower.includes('purchase')) return 'Buyer inquiry';
  if (lower.includes('sell') || lower.includes('list')) return 'Seller inquiry';
  if (lower.includes('rent') || lower.includes('lease')) return 'Rental inquiry';
  if (lower.includes('invest') || lower.includes('investment')) return 'Investment inquiry';
  if (lower.includes('appraisal') || lower.includes('valuation')) return 'Property valuation';
  
  return 'General inquiry';
}

function extractKeyPoints(content: string): string[] {
  const points: string[] = [];
  const lower = content.toLowerCase();
  
  if (lower.includes('budget') || lower.includes('price') || lower.includes('afford')) {
    points.push('Budget and pricing discussed');
  }
  if (lower.includes('location') || lower.includes('area') || lower.includes('neighborhood')) {
    points.push('Location preferences mentioned');
  }
  if (lower.includes('bedrooms') || lower.includes('bathrooms') || lower.includes('square feet')) {
    points.push('Property specifications discussed');
  }
  if (lower.includes('timeline') || lower.includes('when') || lower.includes('by')) {
    points.push('Timeline requirements mentioned');
  }
  
  return points.length > 0 ? points : ['Standard inquiry'];
}

function extractFollowUpItems(content: string): string[] {
  const items: string[] = [];
  const lower = content.toLowerCase();
  
  if (lower.includes('appointment') || lower.includes('showing') || lower.includes('visit')) {
    items.push('Schedule property showing');
  }
  if (lower.includes('send') || lower.includes('email') || lower.includes('info')) {
    items.push('Send property information');
  }
  if (lower.includes('call back') || lower.includes('follow up')) {
    items.push('Follow up call required');
  }
  
  return items;
}

function extractUrgentConcerns(content: string): string[] {
  const concerns: string[] = [];
  const lower = content.toLowerCase();
  
  if (lower.includes('urgent') || lower.includes('asap') || lower.includes('immediately')) {
    concerns.push('Urgent timeline - immediate attention required');
  }
  if (lower.includes('other agent') || lower.includes('competitor') || lower.includes('looking elsewhere')) {
    concerns.push('Considering other agents - risk of losing lead');
  }
  if (lower.includes('price increase') || lower.includes('market moving')) {
    concerns.push('Market timing concerns mentioned');
  }
  
  return concerns;
}

function extractPropertyInterest(content: string): string {
  const lower = content.toLowerCase();
  
  if (lower.includes('condo') || lower.includes('condominium')) return 'Condominium';
  if (lower.includes('house') || lower.includes('home') || lower.includes('single family')) return 'Single Family Home';
  if (lower.includes('townhouse') || lower.includes('townhome')) return 'Townhouse';
  if (lower.includes('apartment')) return 'Apartment';
  if (lower.includes('commercial') || lower.includes('office') || lower.includes('retail')) return 'Commercial';
  if (lower.includes('land') || lower.includes('lot')) return 'Land/Lot';
  
  return 'Not specified';
}

function extractTimeline(content: string): string {
  const lower = content.toLowerCase();
  
  if (lower.includes('immediately') || lower.includes('asap') || lower.includes('urgent')) return 'Immediate (ASAP)';
  if (lower.includes('this month') || lower.includes('30 days')) return 'Within 1 month';
  if (lower.includes('few months') || lower.includes('3 months') || lower.includes('quarter')) return 'Within 3 months';
  if (lower.includes('6 months') || lower.includes('half year')) return 'Within 6 months';
  if (lower.includes('year') || lower.includes('12 months')) return 'Within 1 year';
  if (lower.includes('just looking') || lower.includes('browsing') || lower.includes('no rush')) return 'No specific timeline';
  
  return 'Not specified';
}

function extractContactPreference(content: string): string {
  const lower = content.toLowerCase();
  
  if (lower.includes('email') || lower.includes('e-mail')) return 'Email';
  if (lower.includes('text') || lower.includes('sms') || lower.includes('message')) return 'Text/SMS';
  if (lower.includes('call') || lower.includes('phone')) return 'Phone call';
  if (lower.includes('whatsapp')) return 'WhatsApp';
  
  return 'Phone call'; // Default
} 