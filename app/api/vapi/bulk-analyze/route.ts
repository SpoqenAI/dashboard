import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

interface BulkAnalyzeRequest {
  limit?: number; // Max number of calls to analyze in one batch
  skipExisting?: boolean; // Skip calls that already have analysis
}

export async function POST(request: NextRequest) {
  try {
    const { limit = 10 } = await request.json();

    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const apiKey = process.env.VAPI_PRIVATE_KEY;
    const baseUrl = process.env.VAPI_API_URL || 'https://api.vapi.ai';

    if (!apiKey) {
      return NextResponse.json({ error: 'VAPI API key not configured' }, { status: 500 });
    }

    // Fetch calls from VAPI
    const vapiResponse = await fetch(`${baseUrl}/call?limit=${limit * 2}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });

    if (!vapiResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch calls' }, { status: vapiResponse.status });
    }

    const calls = await vapiResponse.json();
    const answeredCalls = calls.filter((call: any) => call.durationSeconds > 0);

    let processed = 0;
    for (const call of answeredCalls.slice(0, limit)) {
      // Simple sentiment analysis
      const content = call.transcript || call.messages?.map((m: any) => m.message).join(' ') || '';
      const sentiment = getSentiment(content);
      
      await supabase.from('call_analysis').upsert({
        user_id: user.id,
        vapi_call_id: call.id,
        sentiment,
        call_purpose: 'General inquiry',
        lead_quality: 'warm',
        key_points: ['Call analyzed'],
        follow_up_items: [],
        urgent_concerns: [],
      }, { onConflict: 'vapi_call_id' });
      
      processed++;
    }

    return NextResponse.json({ processed });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

function getSentiment(content: string): 'positive' | 'negative' | 'neutral' {
  const lower = content.toLowerCase();
  const positive = ['great', 'excellent', 'love', 'perfect'].some(word => lower.includes(word));
  const negative = ['terrible', 'awful', 'hate', 'problem'].some(word => lower.includes(word));
  
  if (positive && !negative) return 'positive';
  if (negative && !positive) return 'negative';
  return 'neutral';
} 