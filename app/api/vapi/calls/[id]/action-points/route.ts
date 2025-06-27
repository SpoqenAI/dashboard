import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { ActionPoints } from '@/lib/types';

/**
 * Enhanced action points extraction from VAPI's call analysis data
 * Utilizes structured data with intelligent fallbacks and real estate-specific insights
 */
function extractActionPointsFromVapi(callData: any): ActionPoints {
  const analysis = callData.analysis;
  const summary = analysis?.summary || '';
  const transcript = callData.transcript || '';
  const structured = analysis?.structuredData || {};

  logger.debug('VAPI', 'Extracting action points from call data', {
    hasAnalysis: !!analysis,
    hasSummary: !!summary,
    hasTranscript: !!transcript,
    hasStructuredData: !!structured,
    structuredDataKeys: Object.keys(structured),
  });

  // Initialize arrays
  const keyPoints: string[] = [];
  const followUpItems: string[] = [];
  const urgentConcerns: string[] = [];

  // === ENHANCED KEY POINTS EXTRACTION ===

  // 1. Primary: Use VAPI's structured key points
  if (structured.keyPoints && Array.isArray(structured.keyPoints)) {
    keyPoints.push(
      ...structured.keyPoints.filter(
        (point: any) => point && point.trim().length > 0
      )
    );
  }

  // 2. Fallback: Extract from summary if structured data unavailable
  if (keyPoints.length === 0 && summary && summary.trim().length > 0) {
    // Split summary into meaningful segments
    const summaryPoints = extractKeyPointsFromText(summary);
    keyPoints.push(...summaryPoints);
  }

  // 3. Last resort: Extract from transcript using NLP patterns
  if (keyPoints.length === 0 && transcript && transcript.trim().length > 0) {
    const transcriptPoints = extractKeyPointsFromText(transcript);
    keyPoints.push(...transcriptPoints.slice(0, 3)); // Limit to top 3 to avoid noise
  }

  // === ENHANCED FOLLOW-UP ITEMS EXTRACTION ===

  // 1. Primary: Use VAPI's structured follow-up items
  if (structured.followUpItems && Array.isArray(structured.followUpItems)) {
    followUpItems.push(
      ...structured.followUpItems.filter(
        (item: any) => item && item.trim().length > 0
      )
    );
  }

  // Also check for legacy field names
  if (structured.actionItems && Array.isArray(structured.actionItems)) {
    followUpItems.push(
      ...structured.actionItems.filter(
        (item: any) => item && item.trim().length > 0
      )
    );
  }

  if (structured.followUps && Array.isArray(structured.followUps)) {
    followUpItems.push(
      ...structured.followUps.filter(
        (item: any) => item && item.trim().length > 0
      )
    );
  }

  // 2. Fallback: Extract actionable items from text
  if (followUpItems.length === 0) {
    const extractedActions = extractFollowUpItemsFromText(
      summary || transcript
    );
    followUpItems.push(...extractedActions);
  }

  // === ENHANCED URGENT CONCERNS EXTRACTION ===

  // 1. Primary: Use VAPI's structured urgent items
  if (structured.urgentConcerns && Array.isArray(structured.urgentConcerns)) {
    urgentConcerns.push(
      ...structured.urgentConcerns.filter(
        (concern: any) => concern && concern.trim().length > 0
      )
    );
  }

  // Also check for legacy field names
  if (structured.urgentItems && Array.isArray(structured.urgentItems)) {
    urgentConcerns.push(
      ...structured.urgentItems.filter(
        (concern: any) => concern && concern.trim().length > 0
      )
    );
  }

  // 2. Fallback: Extract urgent indicators from text
  if (urgentConcerns.length === 0) {
    const extractedUrgent = extractUrgentConcernsFromText(
      summary || transcript
    );
    urgentConcerns.push(...extractedUrgent);
  }

  // === ENHANCED CALL PURPOSE DETECTION ===

  let callPurpose = 'General inquiry';

  // 1. Primary: Use VAPI's structured call purpose
  if (structured.callPurpose && structured.callPurpose.trim().length > 0) {
    callPurpose = structured.callPurpose.trim();
  }
  // 2. Secondary: Check analysis-level purpose
  else if (analysis?.purpose && analysis.purpose.trim().length > 0) {
    callPurpose = analysis.purpose.trim();
  }
  // 3. Tertiary: Check metadata
  else if (
    callData.metadata?.purpose &&
    callData.metadata.purpose.trim().length > 0
  ) {
    callPurpose = callData.metadata.purpose.trim();
  }
  // 4. Fallback: Intelligent extraction from content
  else {
    callPurpose = extractCallPurposeFromText(summary || transcript);
  }

  // === ENHANCED SENTIMENT ANALYSIS ===

  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';

  // 1. Primary: Use VAPI's structured sentiment
  if (
    structured.sentiment &&
    ['positive', 'neutral', 'negative'].includes(
      structured.sentiment.toLowerCase()
    )
  ) {
    sentiment = structured.sentiment.toLowerCase() as
      | 'positive'
      | 'neutral'
      | 'negative';
  }
  // 2. Secondary: Use analysis-level sentiment
  else if (
    analysis?.sentiment &&
    ['positive', 'neutral', 'negative'].includes(
      analysis.sentiment.toLowerCase()
    )
  ) {
    sentiment = analysis.sentiment.toLowerCase() as
      | 'positive'
      | 'neutral'
      | 'negative';
  }
  // 3. Fallback: Derive from success evaluation
  else if (analysis?.successEvaluation !== undefined) {
    sentiment = deriveSentimentFromSuccess(analysis.successEvaluation);
  }
  // 4. Last resort: Analyze text content
  else {
    sentiment = analyzeSentimentFromText(summary || transcript);
  }

  // === QUALITY ENHANCEMENT ===

  // Remove duplicates and clean up
  const cleanedKeyPoints = deduplicateAndClean(keyPoints);
  const cleanedFollowUps = deduplicateAndClean(followUpItems);
  const cleanedUrgent = deduplicateAndClean(urgentConcerns);

  logger.debug('VAPI', 'Action points extraction completed', {
    keyPointsCount: cleanedKeyPoints.length,
    followUpItemsCount: cleanedFollowUps.length,
    urgentConcernsCount: cleanedUrgent.length,
    sentiment,
    callPurpose,
  });

  return {
    keyPoints: cleanedKeyPoints,
    followUpItems: cleanedFollowUps,
    urgentConcerns: cleanedUrgent,
    sentiment,
    callPurpose,
  };
}

/**
 * Extracts key discussion points from text using NLP patterns
 */
function extractKeyPointsFromText(text: string): string[] {
  if (!text || text.trim().length === 0) return [];

  const points: string[] = [];

  // Split into sentences and analyze
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);

  // Look for important discussion indicators
  const importantPatterns = [
    /(?:discussed|talked about|mentioned|regarding|concerning)\s+(.{10,}?)(?:[.!?]|$)/gi,
    /(?:client|customer|they)\s+(?:wants?|needs?|is interested in|looking for)\s+(.{10,}?)(?:[.!?]|$)/gi,
    /(?:property|house|home|listing|area)\s+(.{10,}?)(?:[.!?]|$)/gi,
    /(?:budget|price range|cost)\s+(.{10,}?)(?:[.!?]|$)/gi,
  ];

  for (const pattern of importantPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const point = match[1]?.trim();
      if (point && point.length > 10 && point.length < 200) {
        points.push(point);
      }
    }
  }

  // If no patterns matched, use first few meaningful sentences
  if (points.length === 0) {
    const meaningfulSentences = sentences
      .filter(s => s.length > 20 && s.length < 200)
      .slice(0, 2);
    points.push(...meaningfulSentences.map(s => s.trim()));
  }

  return points.slice(0, 4); // Limit to 4 key points
}

/**
 * Extracts follow-up actions from text using action-oriented patterns
 */
function extractFollowUpItemsFromText(text: string): string[] {
  if (!text || text.trim().length === 0) return [];

  const actions: string[] = [];

  // Action-oriented patterns for real estate
  const actionPatterns = [
    /(?:need to|should|will|must|have to|going to)\s+(.{10,}?)(?:[.!?]|$)/gi,
    /(?:follow up|call back|send|schedule|arrange|set up|contact)\s+(.{10,}?)(?:[.!?]|$)/gi,
    /(?:next step|next time|tomorrow|this week|soon)\s+(.{10,}?)(?:[.!?]|$)/gi,
    /(?:appointment|meeting|showing|tour|viewing)\s+(.{10,}?)(?:[.!?]|$)/gi,
  ];

  for (const pattern of actionPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const action = match[0]?.trim();
      if (action && action.length > 15 && action.length < 150) {
        actions.push(action);
      }
    }
  }

  return actions.slice(0, 5); // Limit to 5 follow-up items
}

/**
 * Extracts urgent concerns from text using urgency indicators
 */
function extractUrgentConcernsFromText(text: string): string[] {
  if (!text || text.trim().length === 0) return [];

  const urgent: string[] = [];

  // Urgency patterns
  const urgencyPatterns = [
    /(?:urgent|emergency|immediate|asap|right away|quickly|soon|deadline)\s+(.{10,}?)(?:[.!?]|$)/gi,
    /(?:concerned|worried|problem|issue|trouble)\s+(.{10,}?)(?:[.!?]|$)/gi,
    /(?:time sensitive|time critical|expires?|closing soon)\s+(.{10,}?)(?:[.!?]|$)/gi,
  ];

  for (const pattern of urgencyPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const concern = match[0]?.trim();
      if (concern && concern.length > 15 && concern.length < 150) {
        urgent.push(concern);
      }
    }
  }

  return urgent.slice(0, 3); // Limit to 3 urgent concerns
}

/**
 * Extracts call purpose from text using context clues
 */
function extractCallPurposeFromText(text: string): string {
  if (!text || text.trim().length === 0) return 'General inquiry';

  const lowerText = text.toLowerCase();

  // Real estate-specific purpose patterns
  const purposePatterns = [
    {
      pattern:
        /(?:buying|purchase|looking for|interested in buying)\s+(?:a\s+)?(?:house|home|property)/i,
      purpose: 'Home buying inquiry',
    },
    {
      pattern:
        /(?:selling|list|putting.+on.+market)\s+(?:my\s+)?(?:house|home|property)/i,
      purpose: 'Home selling consultation',
    },
    { pattern: /(?:rent|rental|lease|tenant)/i, purpose: 'Rental inquiry' },
    {
      pattern: /(?:investment|investor|investing)\s+(?:property|real estate)/i,
      purpose: 'Investment opportunity',
    },
    {
      pattern:
        /(?:valuation|appraisal|worth|value)\s+(?:of\s+)?(?:my\s+)?(?:house|home|property)/i,
      purpose: 'Property valuation',
    },
    {
      pattern: /(?:mortgage|financing|loan|pre.?approval)/i,
      purpose: 'Financing consultation',
    },
    {
      pattern:
        /(?:showing|tour|visit|see|view)\s+(?:the\s+)?(?:house|home|property)/i,
      purpose: 'Property showing request',
    },
    { pattern: /(?:offer|bid|making.+offer)/i, purpose: 'Offer discussion' },
    {
      pattern: /(?:market|area|neighborhood)\s+(?:analysis|report|update)/i,
      purpose: 'Market consultation',
    },
  ];

  for (const { pattern, purpose } of purposePatterns) {
    if (pattern.test(lowerText)) {
      return purpose;
    }
  }

  // Fallback: Extract first sentence that looks like a purpose
  const sentences = text.split(/[.!?]+/);
  const firstMeaningful = sentences.find(
    s =>
      s.trim().length > 15 &&
      s.trim().length < 100 &&
      /(?:looking|interested|want|need|call|regarding)/i.test(s)
  );

  if (firstMeaningful) {
    return firstMeaningful.trim().replace(/^(?:hi|hello|hey)\s+/i, '');
  }

  return 'General real estate inquiry';
}

/**
 * Derives sentiment from success evaluation
 */
function deriveSentimentFromSuccess(
  successEvaluation: any
): 'positive' | 'neutral' | 'negative' {
  if (typeof successEvaluation === 'boolean') {
    return successEvaluation ? 'positive' : 'negative';
  }

  if (typeof successEvaluation === 'number') {
    if (successEvaluation > 0.7) return 'positive';
    if (successEvaluation < 0.3) return 'negative';
    return 'neutral';
  }

  if (typeof successEvaluation === 'string') {
    const lower = successEvaluation.toLowerCase();
    if (
      lower.includes('success') ||
      lower.includes('positive') ||
      lower.includes('good')
    ) {
      return 'positive';
    }
    if (
      lower.includes('fail') ||
      lower.includes('negative') ||
      lower.includes('bad')
    ) {
      return 'negative';
    }
  }

  return 'neutral';
}

/**
 * Analyzes sentiment from text content
 */
function analyzeSentimentFromText(
  text: string
): 'positive' | 'neutral' | 'negative' {
  if (!text || text.trim().length === 0) return 'neutral';

  const lowerText = text.toLowerCase();

  // Positive indicators
  const positiveWords = [
    'great',
    'excellent',
    'perfect',
    'love',
    'interested',
    'excited',
    'happy',
    'satisfied',
    'good',
    'wonderful',
    'amazing',
    'fantastic',
    'yes',
    'definitely',
    'absolutely',
    'sounds good',
  ];

  // Negative indicators
  const negativeWords = [
    'bad',
    'terrible',
    'awful',
    'hate',
    'disappointed',
    'frustrated',
    'angry',
    'upset',
    'no',
    'not interested',
    'waste',
    'problem',
    'issue',
    'concern',
    'worried',
    'expensive',
    'too much',
  ];

  let positiveScore = 0;
  let negativeScore = 0;

  for (const word of positiveWords) {
    const matches = (lowerText.match(new RegExp(word, 'g')) || []).length;
    positiveScore += matches;
  }

  for (const word of negativeWords) {
    const matches = (lowerText.match(new RegExp(word, 'g')) || []).length;
    negativeScore += matches;
  }

  if (positiveScore > negativeScore && positiveScore > 0) return 'positive';
  if (negativeScore > positiveScore && negativeScore > 0) return 'negative';
  return 'neutral';
}

/**
 * Removes duplicates and cleans up text arrays
 */
function deduplicateAndClean(items: string[]): string[] {
  const cleaned = items
    .map(item => item.trim())
    .filter(item => item.length > 0)
    .filter(item => item.length < 500) // Reasonable length limit
    .map(item => {
      // Clean up common artifacts
      return item
        .replace(/^[^\w]+|[^\w]+$/g, '') // Remove leading/trailing punctuation
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    })
    .filter(item => item.length > 3); // Minimum meaningful length

  // Remove duplicates (case-insensitive)
  const seen = new Set<string>();
  return cleaned.filter(item => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;

  // Validate call ID parameter
  const callId = resolvedParams.id;

  // Check if call ID exists and is a string
  if (!callId || typeof callId !== 'string') {
    logger.warn('VAPI', 'Invalid call ID: missing or not a string', {
      providedId: callId,
      type: typeof callId,
    });
    return NextResponse.json(
      { error: 'Invalid call ID: must be a non-empty string' },
      { status: 400 }
    );
  }

  // Check if call ID is not empty and has reasonable length
  if (callId.trim().length === 0) {
    logger.warn('VAPI', 'Invalid call ID: empty string');
    return NextResponse.json(
      { error: 'Invalid call ID: cannot be empty' },
      { status: 400 }
    );
  }

  if (callId.length < 8 || callId.length > 128) {
    logger.warn('VAPI', 'Invalid call ID: length out of bounds', {
      callId,
      length: callId.length,
    });
    return NextResponse.json(
      { error: 'Invalid call ID: length must be between 8 and 128 characters' },
      { status: 400 }
    );
  }

  // Check if call ID matches expected format (alphanumeric, hyphens, underscores)
  const validIdPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validIdPattern.test(callId)) {
    logger.warn('VAPI', 'Invalid call ID: contains invalid characters', {
      callId,
      allowedPattern: 'alphanumeric characters, hyphens, and underscores only',
    });
    return NextResponse.json(
      {
        error:
          'Invalid call ID: must contain only alphanumeric characters, hyphens, and underscores',
      },
      { status: 400 }
    );
  }

  // Log successful validation for security monitoring
  logger.debug('VAPI', 'Call ID validation passed', {
    callId,
    length: callId.length,
  });

  const apiKey = process.env.VAPI_PRIVATE_KEY;
  const baseUrl = process.env.VAPI_API_URL || 'https://api.vapi.ai';

  if (!apiKey) {
    logger.error('VAPI', 'API key not configured');
    return NextResponse.json(
      { error: 'VAPI API key not configured' },
      { status: 500 }
    );
  }

  try {
    // Fetch the call details from VAPI
    const callUrl = new URL(`/call/${callId}`, baseUrl);

    logger.debug('VAPI', 'Fetching call for action points extraction', {
      callId: callId,
      url: callUrl.toString(),
    });

    const callRes = await fetch(callUrl.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'User-Agent': 'spoqen-dashboard/1.0',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!callRes.ok) {
      logger.error(
        'VAPI',
        'Failed to fetch call for action points',
        undefined,
        {
          status: callRes.status,
          statusText: callRes.statusText,
          callId: callId,
        }
      );
      return NextResponse.json(
        { error: 'Failed to fetch call details' },
        { status: callRes.status }
      );
    }

    const callData = await callRes.json();

    // Check if call has analysis data for action point extraction
    const hasAnalysis = !!callData.analysis;
    const hasSummary = !!callData.analysis?.summary;
    const hasTranscript = !!callData.transcript;

    logger.debug(
      'VAPI',
      'Preparing to extract action points from VAPI analysis',
      {
        callId: callId,
        hasAnalysis,
        hasSummary,
        hasTranscript,
        summaryLength: callData.analysis?.summary?.length || 0,
        transcriptLength: callData.transcript?.length || 0,
      }
    );

    // Validate that we have some analysis data to work with
    if (!hasAnalysis && !hasTranscript) {
      logger.warn('VAPI', 'No analysis or transcript data available', {
        callId: callId,
        hasAnalysis,
        hasTranscript,
      });

      return NextResponse.json(
        {
          error:
            'Cannot extract action points: no analysis or transcript data available',
          callId: callId,
        },
        { status: 400 }
      );
    }

    // Extract action points using VAPI's native analysis
    const actionPoints = extractActionPointsFromVapi(callData);

    // Validate the response structure
    if (!Array.isArray(actionPoints.keyPoints)) {
      actionPoints.keyPoints = [];
    }
    if (!Array.isArray(actionPoints.followUpItems)) {
      actionPoints.followUpItems = [];
    }
    if (!Array.isArray(actionPoints.urgentConcerns)) {
      actionPoints.urgentConcerns = [];
    }
    if (!['positive', 'neutral', 'negative'].includes(actionPoints.sentiment)) {
      actionPoints.sentiment = 'neutral';
    }

    logger.debug(
      'VAPI',
      'Successfully extracted action points from VAPI analysis',
      {
        callId: callId,
        keyPointsCount: actionPoints.keyPoints.length,
        followUpItemsCount: actionPoints.followUpItems.length,
        urgentConcernsCount: actionPoints.urgentConcerns.length,
        sentiment: actionPoints.sentiment,
        callPurpose: actionPoints.callPurpose,
      }
    );

    return NextResponse.json({
      callId: callId,
      actionPoints,
      generatedAt: new Date().toISOString(),
      source: 'vapi-analysis',
    });
  } catch (error) {
    logger.error(
      'VAPI',
      'Failed to extract action points from VAPI analysis',
      error as Error
    );
    return NextResponse.json(
      { error: 'Error extracting action points from VAPI analysis' },
      { status: 500 }
    );
  }
}
