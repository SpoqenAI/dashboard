'use client';
import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FeedbackData } from './types';

interface HelpfulFeedbackProps {
  questionId: string;
}

export default function HelpfulFeedback({ questionId }: HelpfulFeedbackProps) {
  const [feedback, setFeedback] = useState<null | 'yes' | 'no'>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  const handleFeedback = async (feedbackType: 'yes' | 'no') => {
    setIsSubmitting(true);
    setError(null);
    setRetryAfter(null);

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
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 429) {
          // Rate limit exceeded
          const retryAfterSeconds = errorData.retryAfter || 300; // Default to 5 minutes
          setRetryAfter(retryAfterSeconds);
          setError(
            errorData.message ||
              "You've submitted feedback too quickly. Please wait a moment before trying again."
          );
          return;
        } else {
          // Other errors
          setError(
            errorData.message ||
              'Unable to submit feedback right now. Please try again later.'
          );
          return;
        }
      }

      // Success
      setFeedback(feedbackType);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate a cryptographically secure session ID for tracking multiple feedback from same session
  const generateSessionId = (): string => {
    if (typeof window !== 'undefined') {
      let sessionId = sessionStorage.getItem('faq-session-id');
      if (!sessionId) {
        // Use crypto.randomUUID() with secure fallback
        let uuid: string;
        try {
          // Try to use crypto.randomUUID() first
          uuid = crypto.randomUUID();
        } catch (error) {
          // Fallback if crypto.randomUUID() is not available
          try {
            // Secure fallback using crypto.getRandomValues()
            uuid = generateSecureUUID();
          } catch (fallbackError) {
            // Final fallback if all crypto methods fail
            console.warn('Crypto API unavailable, using timestamp-based ID');
            uuid = generateTimestampBasedId();
          }
        }
        sessionId = `session_${Date.now()}_${uuid}`;
        sessionStorage.setItem('faq-session-id', sessionId);
      }
      return sessionId;
    }
    // Fallback for server-side (though this shouldn't happen in practice)
    return `session_${Date.now()}_server`;
  };

  // Generate cryptographically secure UUID using crypto.getRandomValues()
  const generateSecureUUID = (): string => {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);

    // Set version (4) and variant bits according to RFC 4122
    array[6] = (array[6] & 0x0f) | 0x40; // Version 4
    array[8] = (array[8] & 0x3f) | 0x80; // Variant 10

    const hex = Array.from(array, byte =>
      byte.toString(16).padStart(2, '0')
    ).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  };

  // Non-cryptographic but deterministic fallback (better than Math.random)
  const generateTimestampBasedId = (): string => {
    const timestamp = Date.now().toString(36);
    const counter = (performance.now() * 1000).toString(36);
    const random = Array.from({ length: 8 }, () =>
      ((Date.now() + performance.now()) % 36).toString(36)
    ).join('');
    return `${timestamp}-${counter}-${random}`;
  };

  // Helper function to format retry time
  const formatRetryTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  if (feedback) {
    return (
      <p className="mt-2 text-sm text-muted-foreground">
        Thanks for the feedback!
      </p>
    );
  }

  if (error) {
    return (
      <div className="mt-2 space-y-2">
        <div className="flex items-center gap-2 text-sm text-red-600">
          <span>{error}</span>
        </div>
        {retryAfter && (
          <p className="text-xs text-muted-foreground">
            Please wait {formatRetryTime(retryAfter)} before submitting more
            feedback.
          </p>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setError(null);
            setRetryAfter(null);
          }}
          className="text-xs"
        >
          Try Again
        </Button>
      </div>
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
      {isSubmitting && (
        <span className="text-xs text-muted-foreground">Submitting...</span>
      )}
    </div>
  );
}
