import { ActionPoints } from '@/lib/types';
import { logger } from '@/lib/logger';

/**
 * Service class for extracting action points from VAPI call analysis data
 * Encapsulates sophisticated extraction logic with intelligent fallbacks
 */
export class ActionPointsExtractor {
  /**
   * Main extraction method that processes VAPI call data and returns structured action points
   */
  public extract(callData: any): ActionPoints {
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

    // Extract each component
    this.extractKeyPoints(structured, summary, transcript, keyPoints);
    this.extractFollowUpItems(structured, summary, transcript, followUpItems);
    this.extractUrgentConcerns(structured, summary, transcript, urgentConcerns);

    const callPurpose = this.extractCallPurpose(
      structured,
      analysis,
      callData,
      summary,
      transcript
    );
    const sentiment = this.extractSentiment(
      structured,
      analysis,
      summary,
      transcript
    );

    // Clean and deduplicate results
    const cleanedKeyPoints = this.deduplicateAndClean(keyPoints);
    const cleanedFollowUps = this.deduplicateAndClean(followUpItems);
    const cleanedUrgent = this.deduplicateAndClean(urgentConcerns);

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
   * Enhanced key points extraction with multiple fallback strategies
   */
  private extractKeyPoints(
    structured: any,
    summary: string,
    transcript: string,
    keyPoints: string[]
  ): void {
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
      const summaryPoints = this.extractKeyPointsFromText(summary);
      keyPoints.push(...summaryPoints);
    }

    // 3. Last resort: Extract from transcript using NLP patterns
    if (keyPoints.length === 0 && transcript && transcript.trim().length > 0) {
      const transcriptPoints = this.extractKeyPointsFromText(transcript);
      keyPoints.push(...transcriptPoints.slice(0, 3)); // Limit to top 3 to avoid noise
    }
  }

  /**
   * Enhanced follow-up items extraction with multiple sources
   */
  private extractFollowUpItems(
    structured: any,
    summary: string,
    transcript: string,
    followUpItems: string[]
  ): void {
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
      const extractedActions = this.extractFollowUpItemsFromText(
        summary || transcript
      );
      followUpItems.push(...extractedActions);
    }
  }

  /**
   * Enhanced urgent concerns extraction with fallback analysis
   */
  private extractUrgentConcerns(
    structured: any,
    summary: string,
    transcript: string,
    urgentConcerns: string[]
  ): void {
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
      const extractedUrgent = this.extractUrgentConcernsFromText(
        summary || transcript
      );
      urgentConcerns.push(...extractedUrgent);
    }
  }

  /**
   * Enhanced call purpose detection with multiple strategies
   */
  private extractCallPurpose(
    structured: any,
    analysis: any,
    callData: any,
    summary: string,
    transcript: string
  ): string {
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
      callPurpose = this.extractCallPurposeFromText(summary || transcript);
    }

    return callPurpose;
  }

  /**
   * Enhanced sentiment analysis with multiple data sources
   */
  private extractSentiment(
    structured: any,
    analysis: any,
    summary: string,
    transcript: string
  ): 'positive' | 'neutral' | 'negative' {
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
      sentiment = this.deriveSentimentFromSuccess(analysis.successEvaluation);
    }
    // 4. Last resort: Analyze text content
    else {
      sentiment = this.analyzeSentimentFromText(summary || transcript);
    }

    return sentiment;
  }

  /**
   * Extracts key discussion points from text using NLP patterns
   */
  private extractKeyPointsFromText(text: string): string[] {
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
  private extractFollowUpItemsFromText(text: string): string[] {
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
  private extractUrgentConcernsFromText(text: string): string[] {
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
  private extractCallPurposeFromText(text: string): string {
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
        pattern:
          /(?:investment|investor|investing)\s+(?:property|real estate)/i,
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
  private deriveSentimentFromSuccess(
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
  private analyzeSentimentFromText(
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
  private deduplicateAndClean(items: string[]): string[] {
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
}
