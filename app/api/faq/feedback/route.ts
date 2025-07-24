import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import type { FeedbackData, StoredFeedbackData } from '@/app/faq/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.questionId || !body.feedback || !body.timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields: questionId, feedback, timestamp' },
        { status: 400 }
      );
    }

    // Validate feedback value
    if (!['helpful', 'not_helpful'].includes(body.feedback)) {
      return NextResponse.json(
        { error: 'Invalid feedback value. Must be "helpful" or "not_helpful"' },
        { status: 400 }
      );
    }

    const feedbackData: FeedbackData = {
      questionId: body.questionId,
      feedback: body.feedback,
      timestamp: body.timestamp,
      userAgent: body.userAgent,
      sessionId: body.sessionId,
    };

    // Get additional tracking data from request
    const headersList = await headers();
    const ipAddress =
      headersList.get('x-forwarded-for') ||
      headersList.get('x-real-ip') ||
      'unknown';
    const referrer = headersList.get('referer') || undefined;

    // Store feedback in Supabase database
    const supabase = await createClient();
    const feedbackId = generateFeedbackId();

    const { data, error } = await supabase
      .from('faq_feedback')
      .insert({
        id: feedbackId,
        question_id: feedbackData.questionId,
        feedback: feedbackData.feedback,
        timestamp: feedbackData.timestamp,
        user_agent: feedbackData.userAgent,
        session_id: feedbackData.sessionId,
        ip_address: ipAddress,
        referrer: referrer,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to store feedback' },
        { status: 500 }
      );
    }

    // Log for analytics
    console.log('FAQ Feedback recorded in database:', {
      id: feedbackId,
      questionId: feedbackData.questionId,
      feedback: feedbackData.feedback,
      timestamp: feedbackData.timestamp,
      sessionId: feedbackData.sessionId,
    });

    // In production, you might want to:
    // 1. Save to Supabase database
    // 2. Send to analytics service (Google Analytics, Mixpanel, etc.)
    // 3. Update question improvement scores
    // 4. Trigger alerts for questions with high negative feedback

    return NextResponse.json({
      success: true,
      message: 'Feedback recorded successfully',
      feedbackId: feedbackId,
    });
  } catch (error) {
    console.error('Error processing FAQ feedback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get('questionId');

    // Get feedback from Supabase database
    const supabase = await createClient();

    let query = supabase
      .from('faq_feedback')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by question ID if provided
    if (questionId) {
      query = query.eq('question_id', questionId);
    }

    const { data: results, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch feedback' },
        { status: 500 }
      );
    }

    const feedbackData = results || [];

    // Calculate analytics
    const analytics = {
      totalFeedback: feedbackData.length,
      helpful: feedbackData.filter(f => f.feedback === 'helpful').length,
      notHelpful: feedbackData.filter(f => f.feedback === 'not_helpful').length,
      helpfulPercentage:
        feedbackData.length > 0
          ? Math.round(
              (feedbackData.filter(f => f.feedback === 'helpful').length /
                feedbackData.length) *
                100
            )
          : 0,
    };

    // Group by question for insights
    const byQuestion = feedbackData.reduce(
      (acc, feedback) => {
        if (!acc[feedback.question_id]) {
          acc[feedback.question_id] = {
            questionId: feedback.question_id,
            helpful: 0,
            notHelpful: 0,
            total: 0,
          };
        }

        acc[feedback.question_id].total++;
        if (feedback.feedback === 'helpful') {
          acc[feedback.question_id].helpful++;
        } else {
          acc[feedback.question_id].notHelpful++;
        }

        return acc;
      },
      {} as Record<string, any>
    );

    // Find questions that need improvement (low helpful rate)
    const questionInsights = Object.values(byQuestion)
      .map((q: any) => ({
        ...q,
        helpfulPercentage: Math.round((q.helpful / q.total) * 100),
        needsImprovement: q.total >= 3 && q.helpful / q.total < 0.6, // Less than 60% helpful with at least 3 responses
      }))
      .sort((a: any, b: any) => a.helpfulPercentage - b.helpfulPercentage);

    return NextResponse.json({
      analytics,
      questionInsights,
      feedback: questionId ? results : results.slice(-50), // Limit recent feedback to 50 items
    });
  } catch (error) {
    console.error('Error fetching FAQ feedback analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateFeedbackId(): string {
  // Use crypto.randomUUID() for cryptographically secure randomness
  const uuid = crypto.randomUUID();
  return `feedback_${Date.now()}_${uuid}`;
}
