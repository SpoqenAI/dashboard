'use client';
import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HelpfulFeedbackProps {
  questionId: string;
}

interface FeedbackData {
  questionId: string;
  feedback: 'helpful' | 'not_helpful';
  timestamp: string;
  userAgent?: string;
  sessionId?: string;
}

export default function HelpfulFeedback({ questionId }: HelpfulFeedbackProps) {
  const [feedback, setFeedback] = useState<null | 'yes' | 'no'>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeedback = async (feedbackType: 'yes' | 'no') => {
    setIsSubmitting(true);

    try {
      const feedbackData: FeedbackData = {
        questionId,
        feedback: feedbackType === 'yes' ? 'helpful' : 'not_helpful',
        timestamp: new Date().toISOString(),
        userAgent:
          typeof window !== 'undefined' ? navigator.userAgent : undefined,
        sessionId:
          typeof window !== 'undefined' ? generateSessionId() : undefined,
      };

      // Send feedback to API endpoint
      const response = await fetch('/api/faq/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      setFeedback(feedbackType);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      // Still set feedback state for UX, even if tracking fails
      setFeedback(feedbackType);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate a cryptographically secure session ID for tracking multiple feedback from same session
  const generateSessionId = (): string => {
    if (typeof window !== 'undefined') {
      let sessionId = sessionStorage.getItem('faq-session-id');
      if (!sessionId) {
        // Use crypto.randomUUID() for cryptographically secure randomness
        const uuid = crypto.randomUUID();
        sessionId = `session_${Date.now()}_${uuid}`;
        sessionStorage.setItem('faq-session-id', sessionId);
      }
      return sessionId;
    }
    // Fallback for server-side (though this shouldn't happen in practice)
    return `session_${Date.now()}_server`;
  };

  if (feedback) {
    return (
      <p className="mt-2 text-sm text-muted-foreground">
        Thanks for the feedback!
      </p>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-2 text-sm">
      <span>Was this helpful?</span>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Yes, this was helpful"
        onClick={() => handleFeedback('yes')}
        disabled={isSubmitting}
      >
        <ThumbsUp className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="No, this was not helpful"
        onClick={() => handleFeedback('no')}
        disabled={isSubmitting}
      >
        <ThumbsDown className="h-4 w-4" />
      </Button>
    </div>
  );
}
