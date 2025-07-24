import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

interface FeedbackData {
  questionId: string;
  feedback: 'helpful' | 'not_helpful';
  timestamp: string;
  userAgent?: string;
  sessionId?: string;
}

interface StoredFeedbackData extends FeedbackData {
  id: string;
  ipAddress?: string;
  referrer?: string;
}

// In-memory storage for demo - in production, use a database
let feedbackStorage: StoredFeedbackData[] = [];

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

    // Store feedback with additional metadata
    const storedFeedback: StoredFeedbackData = {
      ...feedbackData,
      id: generateFeedbackId(),
      ipAddress,
      referrer,
    };

    // Add to storage (in production, save to database)
    feedbackStorage.push(storedFeedback);

    // Log for analytics (in production, send to analytics service)
    console.log('FAQ Feedback received:', {
      questionId: storedFeedback.questionId,
      feedback: storedFeedback.feedback,
      timestamp: storedFeedback.timestamp,
      sessionId: storedFeedback.sessionId,
    });

    // In production, you might want to:
    // 1. Save to Supabase database
    // 2. Send to analytics service (Google Analytics, Mixpanel, etc.)
    // 3. Update question improvement scores
    // 4. Trigger alerts for questions with high negative feedback

    return NextResponse.json({
      success: true,
      message: 'Feedback recorded successfully',
      feedbackId: storedFeedback.id,
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

    let results = feedbackStorage;

    // Filter by question ID if provided
    if (questionId) {
      results = feedbackStorage.filter(f => f.questionId === questionId);
    }

    // Calculate analytics
    const analytics = {
      totalFeedback: results.length,
      helpful: results.filter(f => f.feedback === 'helpful').length,
      notHelpful: results.filter(f => f.feedback === 'not_helpful').length,
      helpfulPercentage:
        results.length > 0
          ? Math.round(
              (results.filter(f => f.feedback === 'helpful').length /
                results.length) *
                100
            )
          : 0,
    };

    // Group by question for insights
    const byQuestion = results.reduce(
      (acc, feedback) => {
        if (!acc[feedback.questionId]) {
          acc[feedback.questionId] = {
            questionId: feedback.questionId,
            helpful: 0,
            notHelpful: 0,
            total: 0,
          };
        }

        acc[feedback.questionId].total++;
        if (feedback.feedback === 'helpful') {
          acc[feedback.questionId].helpful++;
        } else {
          acc[feedback.questionId].notHelpful++;
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
  return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
