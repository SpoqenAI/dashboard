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
