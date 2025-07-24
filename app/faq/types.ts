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

// Database record interface - matches the actual database schema
export interface DatabaseFeedbackRecord {
  id: string;
  question_id: string;
  feedback: 'helpful' | 'not_helpful';
  timestamp: string;
  user_agent: string | null;
  session_id: string | null;
  ip_address: string | null;
  referrer: string | null;
  created_at: string; // Supabase automatically adds this timestamp
  updated_at?: string; // Optional update timestamp
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
  feedback: DatabaseFeedbackRecord[]; // Properly typed database records
}
