// Shared types for FAQ functionality

export interface FeedbackData {
  questionId: string;
  feedback: 'helpful' | 'not_helpful';
  timestamp: string;
  userAgent?: string;
  sessionId?: string;
}

export interface StoredFeedbackData extends FeedbackData {
  id: string;
  ipAddress?: string;
  referrer?: string;
}

// Analytics and aggregation types
export interface FeedbackAnalytics {
  totalFeedback: number;
  helpful: number;
  notHelpful: number;
  helpfulPercentage: number;
}

export interface QuestionFeedbackSummary {
  questionId: string;
  helpful: number;
  notHelpful: number;
  total: number;
}

export interface QuestionInsight extends QuestionFeedbackSummary {
  helpfulPercentage: number;
  needsImprovement: boolean;
}

export interface FeedbackAnalyticsResponse {
  analytics: FeedbackAnalytics;
  questionInsights: QuestionInsight[];
  feedback: any[]; // Database records - could be further typed if needed
}
