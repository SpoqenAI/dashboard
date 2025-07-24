import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import type {
  FeedbackData,
  StoredFeedbackData,
  FeedbackAnalytics,
  QuestionFeedbackSummary,
  QuestionInsight,
  FeedbackAnalyticsResponse,
} from '@/app/faq/types';
import {
  faqFeedbackRateLimiter,
  checkMultipleRateLimits,
} from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    // Get IP address and other identifiers for rate limiting
    const headersList = await headers();
    const ipAddress =
      headersList.get('x-forwarded-for') ||
      headersList.get('x-real-ip') ||
      'unknown';

    // Validate request body size to prevent DoS attacks
    const sizeValidation = await validateRequestBodySize(request, {
      maxBodySize: 1024, // 1KB limit for FAQ feedback
      endpoint: 'faq-feedback',
    });

    if (!sizeValidation.isValid) {
      // Log potential DoS attempt for security monitoring
      console.warn('Request body size limit exceeded:', {
        ipAddress: ipAddress.substring(0, 8) + '***',
        contentLength: sizeValidation.actualSize,
        maxAllowed: sizeValidation.maxSize,
        endpoint: 'faq-feedback',
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          error: 'Request body too large',
          message: sizeValidation.error,
          maxSize: sizeValidation.maxSize,
          actualSize: sizeValidation.actualSize,
        },
        { status: 413 } // Payload Too Large
      );
    }

    const body = sizeValidation.parsedBody;

    // Validate required fields
    if (!body.questionId || !body.feedback || !body.timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields: questionId, feedback, timestamp' },
        { status: 400 }
      );
    }

    // Validate questionId format for security
    const questionIdValidation = validateQuestionId(body.questionId);
    if (!questionIdValidation.isValid) {
      return NextResponse.json(
        {
          error: 'Invalid questionId format',
          message: questionIdValidation.error,
          details: 'Question ID must be a valid identifier format',
        },
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

    // Additional field-level size validation for extra security
    const fieldValidation = validateFeedbackFieldSizes(feedbackData);
    if (!fieldValidation.isValid) {
      return NextResponse.json(
        {
          error: 'Field size validation failed',
          message: fieldValidation.error,
          details: 'One or more fields exceed maximum allowed length',
        },
        { status: 400 }
      );
    }

    // Rate limiting check
    const rateLimitChecks = [
      {
        limiter: faqFeedbackRateLimiter.ip,
        identifier: ipAddress,
        name: 'ip',
      },
    ];

    // Add session-based rate limiting if session ID is provided
    if (feedbackData.sessionId) {
      rateLimitChecks.push({
        limiter: faqFeedbackRateLimiter.session,
        identifier: feedbackData.sessionId,
        name: 'session',
      });
    }

    const rateLimitResult = checkMultipleRateLimits(rateLimitChecks);

    if (!rateLimitResult.allowed) {
      console.warn('Rate limit exceeded for FAQ feedback:', {
        ipAddress: ipAddress.substring(0, 8) + '***', // Partial IP for privacy
        hasSessionId: !!feedbackData.sessionId, // Only log presence, not the actual ID
        failedCheck: rateLimitResult.failedCheck,
        retryAfter: rateLimitResult.retryAfter,
      });

      const response = NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message:
            rateLimitResult.failedCheck === 'ip'
              ? "You've submitted feedback too quickly from this location. Please wait a few minutes before trying again."
              : "You've submitted a lot of feedback recently. Please wait a few minutes before submitting more.",
          retryAfter: rateLimitResult.retryAfter,
          type: 'rate_limit',
          failedCheck: rateLimitResult.failedCheck,
        },
        { status: 429 }
      );

      // Add standard rate limit headers
      if (rateLimitResult.retryAfter) {
        response.headers.set(
          'Retry-After',
          rateLimitResult.retryAfter.toString()
        );
      }
      response.headers.set('X-RateLimit-Limit', '5');
      response.headers.set('X-RateLimit-Remaining', '0');

      return response;
    }

    // Get additional tracking data from request
    const referrer = headersList.get('referer') || undefined;

    // Store feedback in Supabase database
    const supabase = await createClient();
    const feedbackId = generateFeedbackId();

    const { error } = await supabase.from('faq_feedback').insert({
      id: feedbackId,
      question_id: feedbackData.questionId,
      feedback: feedbackData.feedback,
      timestamp: feedbackData.timestamp,
      user_agent: feedbackData.userAgent,
      session_id: feedbackData.sessionId,
      ip_address: ipAddress,
      referrer: referrer,
    });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to store feedback' },
        { status: 500 }
      );
    }

    // Log for analytics (excluding sensitive session data)
    console.log('FAQ Feedback recorded in database:', {
      id: feedbackId,
      questionId: feedbackData.questionId,
      feedback: feedbackData.feedback,
      timestamp: feedbackData.timestamp,
      hasSessionId: !!feedbackData.sessionId, // Only log presence, not the actual ID
    });

    // Production enhancements to consider:
    // 1. [DONE] Database storage (implemented)
    // 2. Analytics service integration (Google Analytics, Mixpanel, etc.)
    // 3. Automated question improvement scoring system
    // 4. Alert system for questions with high negative feedback rates
    // 5. A/B testing for question variations
    // 6. Real-time dashboard for feedback monitoring

    // Create response with rate limit headers
    const response = NextResponse.json({
      success: true,
      message: 'Feedback recorded successfully',
      feedbackId: feedbackId,
    });

    // Add rate limit headers to successful responses
    const ipResult = rateLimitResult.results.ip;
    if (ipResult) {
      response.headers.set('X-RateLimit-Limit', '5');
      response.headers.set(
        'X-RateLimit-Remaining',
        ipResult.remaining.toString()
      );
      response.headers.set(
        'X-RateLimit-Reset',
        Math.ceil(ipResult.resetTime / 1000).toString()
      );
    }

    return response;
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
    const questionIdParam = searchParams.get('questionId');

    // Validate questionId parameter if provided
    let validatedQuestionId: string | null = null;
    if (questionIdParam) {
      const questionIdValidation = validateQuestionId(questionIdParam);
      if (!questionIdValidation.isValid) {
        return NextResponse.json(
          {
            error: 'Invalid questionId parameter',
            message: questionIdValidation.error,
            details: 'Question ID must be a valid identifier format',
          },
          { status: 400 }
        );
      }
      validatedQuestionId = questionIdValidation.sanitizedValue;
    }

    // Get feedback from Supabase database
    const supabase = await createClient();

    // Validate and sanitize pagination parameters
    const { page, limit, offset, validationErrors } = validatePaginationParams(
      searchParams.get('page'),
      searchParams.get('limit')
    );

    // Return validation errors if any
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid pagination parameters',
          details: validationErrors,
          message:
            'Page and limit must be positive integers. Using default values.',
        },
        { status: 400 }
      );
    }

    let query = supabase
      .from('faq_feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by question ID if provided and validated
    if (validatedQuestionId) {
      query = query.eq('question_id', validatedQuestionId);
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
    const analytics: FeedbackAnalytics = {
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
      {} as Record<string, QuestionFeedbackSummary>
    );

    // Find questions that need improvement (low helpful rate)
    const questionInsights: QuestionInsight[] = Object.values(byQuestion)
      .map(
        (q: QuestionFeedbackSummary): QuestionInsight => ({
          ...q,
          helpfulPercentage: Math.round((q.helpful / q.total) * 100),
          needsImprovement: q.total >= 3 && q.helpful / q.total < 0.6, // Less than 60% helpful with at least 3 responses
        })
      )
      .sort(
        (a: QuestionInsight, b: QuestionInsight) =>
          a.helpfulPercentage - b.helpfulPercentage
      );

    const response: FeedbackAnalyticsResponse = {
      analytics,
      questionInsights,
      feedback: validatedQuestionId ? results : results.slice(-50), // Limit recent feedback to 50 items
    };

    return NextResponse.json(response);
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

// Question ID validation utility for security
function validateQuestionId(questionId: string): {
  isValid: boolean;
  error?: string;
  sanitizedValue?: string;
} {
  // Check for null/undefined/empty
  if (!questionId || typeof questionId !== 'string') {
    return {
      isValid: false,
      error: 'Question ID is required and must be a string',
    };
  }

  // Trim whitespace
  const trimmed = questionId.trim();

  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: 'Question ID cannot be empty',
    };
  }

  // Check length constraints (prevent excessively long IDs)
  if (trimmed.length > 100) {
    return {
      isValid: false,
      error: 'Question ID is too long (max 100 characters)',
    };
  }

  // Define allowed patterns for question IDs
  // This covers common ID formats: alphanumeric, hyphens, underscores, dots
  // Examples: "question-1", "faq_item_123", "q.1.2.3", "uuid-format"
  const allowedPattern = /^[a-zA-Z0-9._-]+$/;

  if (!allowedPattern.test(trimmed)) {
    return {
      isValid: false,
      error:
        'Question ID contains invalid characters. Only letters, numbers, hyphens, underscores, and dots are allowed',
    };
  }

  // Additional security checks

  // Prevent SQL injection attempts
  const sqlInjectionPatterns = [
    /['";]/, // Quote characters
    /--/, // SQL comments
    /\/\*/, // Multi-line comments
    /\bor\b/i, // OR keyword
    /\band\b/i, // AND keyword
    /\bunion\b/i, // UNION keyword
    /\bselect\b/i, // SELECT keyword
    /\binsert\b/i, // INSERT keyword
    /\bupdate\b/i, // UPDATE keyword
    /\bdelete\b/i, // DELETE keyword
    /\bdrop\b/i, // DROP keyword
    /\bexec\b/i, // EXEC keyword
    /\bscript\b/i, // SCRIPT keyword
  ];

  for (const pattern of sqlInjectionPatterns) {
    if (pattern.test(trimmed)) {
      return {
        isValid: false,
        error: 'Question ID contains potentially unsafe characters',
      };
    }
  }

  // Prevent path traversal attempts
  if (
    trimmed.includes('..') ||
    trimmed.includes('/') ||
    trimmed.includes('\\')
  ) {
    return {
      isValid: false,
      error: 'Question ID contains invalid path characters',
    };
  }

  // Prevent control characters and special Unicode
  if (/[\x00-\x1f\x7f-\x9f]/.test(trimmed)) {
    return {
      isValid: false,
      error: 'Question ID contains control characters',
    };
  }

  // Additional validation: ensure it doesn't start/end with special chars
  if (/^[._-]|[._-]$/.test(trimmed)) {
    return {
      isValid: false,
      error: 'Question ID cannot start or end with special characters',
    };
  }

  // If all checks pass, return the sanitized value
  return {
    isValid: true,
    sanitizedValue: trimmed,
  };
}

// Request body size validation utility for DoS protection
async function validateRequestBodySize(
  request: NextRequest,
  options: {
    maxBodySize: number;
    endpoint: string;
  }
): Promise<{
  isValid: boolean;
  error?: string;
  maxSize: number;
  actualSize?: number;
  parsedBody?: any;
}> {
  const { maxBodySize, endpoint } = options;

  // Layer 1: Check Content-Length header (fast rejection)
  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader) {
    const contentLength = parseInt(contentLengthHeader, 10);

    if (isNaN(contentLength)) {
      return {
        isValid: false,
        error: 'Invalid Content-Length header',
        maxSize: maxBodySize,
      };
    }

    if (contentLength > maxBodySize) {
      return {
        isValid: false,
        error: `Request body size (${contentLength} bytes) exceeds maximum allowed size (${maxBodySize} bytes)`,
        maxSize: maxBodySize,
        actualSize: contentLength,
      };
    }

    if (contentLength === 0) {
      return {
        isValid: false,
        error: 'Request body is empty',
        maxSize: maxBodySize,
        actualSize: 0,
      };
    }
  }

  // Layer 2: Streaming size validation with JSON parsing
  try {
    const reader = request.body?.getReader();
    if (!reader) {
      return {
        isValid: false,
        error: 'Request body is not readable',
        maxSize: maxBodySize,
      };
    }

    let totalSize = 0;
    const chunks: Uint8Array[] = [];

    // Read body in chunks while monitoring size
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalSize += value.length;

      // Fail fast if size exceeds limit during streaming
      if (totalSize > maxBodySize) {
        return {
          isValid: false,
          error: `Request body size exceeds maximum allowed size during streaming (${maxBodySize} bytes)`,
          maxSize: maxBodySize,
          actualSize: totalSize,
        };
      }

      chunks.push(value);
    }

    // Reconstruct the body for JSON parsing
    const fullBody = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of chunks) {
      fullBody.set(chunk, offset);
      offset += chunk.length;
    }

    // Parse JSON and validate structure
    let parsedBody;
    try {
      const bodyText = new TextDecoder().decode(fullBody);
      parsedBody = JSON.parse(bodyText);
    } catch (jsonError) {
      return {
        isValid: false,
        error: 'Invalid JSON format in request body',
        maxSize: maxBodySize,
        actualSize: totalSize,
      };
    }

    // Validate that parsed body is an object (not array or primitive)
    if (
      !parsedBody ||
      typeof parsedBody !== 'object' ||
      Array.isArray(parsedBody)
    ) {
      return {
        isValid: false,
        error: 'Request body must be a JSON object',
        maxSize: maxBodySize,
        actualSize: totalSize,
      };
    }

    return {
      isValid: true,
      maxSize: maxBodySize,
      actualSize: totalSize,
      parsedBody,
    };
  } catch (error) {
    return {
      isValid: false,
      error: `Error reading request body: ${error instanceof Error ? error.message : 'Unknown error'}`,
      maxSize: maxBodySize,
    };
  }
}

// Field-level size validation for additional security
function validateFeedbackFieldSizes(feedbackData: FeedbackData): {
  isValid: boolean;
  error?: string;
} {
  const fieldLimits = {
    questionId: 100, // Already validated in validateQuestionId
    feedback: 20, // 'helpful' or 'not_helpful' + buffer
    timestamp: 50, // ISO 8601 format + buffer
    userAgent: 500, // Reasonable browser string limit
    sessionId: 100, // UUID format + prefix
  };

  // Validate questionId length (additional check)
  if (
    feedbackData.questionId &&
    feedbackData.questionId.length > fieldLimits.questionId
  ) {
    return {
      isValid: false,
      error: `questionId exceeds maximum length of ${fieldLimits.questionId} characters`,
    };
  }

  // Validate feedback length
  if (
    feedbackData.feedback &&
    feedbackData.feedback.length > fieldLimits.feedback
  ) {
    return {
      isValid: false,
      error: `feedback exceeds maximum length of ${fieldLimits.feedback} characters`,
    };
  }

  // Validate timestamp length
  if (
    feedbackData.timestamp &&
    feedbackData.timestamp.length > fieldLimits.timestamp
  ) {
    return {
      isValid: false,
      error: `timestamp exceeds maximum length of ${fieldLimits.timestamp} characters`,
    };
  }

  // Validate userAgent length (optional field)
  if (
    feedbackData.userAgent &&
    feedbackData.userAgent.length > fieldLimits.userAgent
  ) {
    return {
      isValid: false,
      error: `userAgent exceeds maximum length of ${fieldLimits.userAgent} characters`,
    };
  }

  // Validate sessionId length (optional field)
  if (
    feedbackData.sessionId &&
    feedbackData.sessionId.length > fieldLimits.sessionId
  ) {
    return {
      isValid: false,
      error: `sessionId exceeds maximum length of ${fieldLimits.sessionId} characters`,
    };
  }

  return { isValid: true };
}

// Pagination validation utility
function validatePaginationParams(
  pageParam: string | null,
  limitParam: string | null
): {
  page: number;
  limit: number;
  offset: number;
  validationErrors: string[];
} {
  const validationErrors: string[] = [];

  // Default values
  const DEFAULT_PAGE = 1;
  const DEFAULT_LIMIT = 100;
  const MAX_LIMIT = 1000; // Prevent excessive data retrieval
  const MIN_PAGE = 1;
  const MIN_LIMIT = 1;

  let page = DEFAULT_PAGE;
  let limit = DEFAULT_LIMIT;

  // Validate page parameter
  if (pageParam !== null) {
    const parsedPage = parseInt(pageParam, 10);

    if (isNaN(parsedPage)) {
      validationErrors.push(
        `Invalid page parameter: "${pageParam}" is not a number`
      );
    } else if (parsedPage < MIN_PAGE) {
      validationErrors.push(
        `Invalid page parameter: ${parsedPage} must be >= ${MIN_PAGE}`
      );
    } else if (!Number.isInteger(parsedPage)) {
      validationErrors.push(
        `Invalid page parameter: ${parsedPage} must be an integer`
      );
    } else {
      page = parsedPage;
    }
  }

  // Validate limit parameter
  if (limitParam !== null) {
    const parsedLimit = parseInt(limitParam, 10);

    if (isNaN(parsedLimit)) {
      validationErrors.push(
        `Invalid limit parameter: "${limitParam}" is not a number`
      );
    } else if (parsedLimit < MIN_LIMIT) {
      validationErrors.push(
        `Invalid limit parameter: ${parsedLimit} must be >= ${MIN_LIMIT}`
      );
    } else if (parsedLimit > MAX_LIMIT) {
      validationErrors.push(
        `Invalid limit parameter: ${parsedLimit} must be <= ${MAX_LIMIT}`
      );
    } else if (!Number.isInteger(parsedLimit)) {
      validationErrors.push(
        `Invalid limit parameter: ${parsedLimit} must be an integer`
      );
    } else {
      limit = parsedLimit;
    }
  }

  // Calculate offset
  const offset = (page - 1) * limit;

  // Additional safety check for offset overflow
  if (offset < 0) {
    validationErrors.push(`Calculated offset ${offset} is negative`);
  }

  return {
    page,
    limit,
    offset,
    validationErrors,
  };
}
