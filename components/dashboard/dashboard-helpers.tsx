import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Filter as BadWordsFilter } from 'bad-words';
import {
  CheckCircle,
  XCircle,
  Phone,
  Smile,
  Meh,
  Frown,
  Flame,
  Thermometer,
  Snowflake,
} from 'lucide-react';

// Initialize content filter outside component to prevent recreation on every render
export const contentFilter = new BadWordsFilter();
contentFilter.addWords('scam', 'fraud', 'fake', 'illegal', 'drugs');

// Move helper functions outside component for better performance
export const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const calculateAndFormatCallDuration = (
  startedAt: string,
  endedAt?: string
): string => {
  if (!startedAt || !endedAt) {
    return '-';
  }

  const durationSeconds = Math.round(
    (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000
  );

  return formatDuration(durationSeconds);
};

export const formatDate = (dateString: string): string => {
  // Compact format for table views - date only
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatDateDetailed = (dateString: string): string => {
  // Detailed format for modals and detailed views - date and time
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Memoized helper function to get sentiment badge
export const getSentimentBadge = memo(
  ({ sentiment }: { sentiment?: string }) => {
    if (!sentiment) {
      return <span className="text-xs text-muted-foreground">-</span>;
    }

    const config = {
      positive: {
        icon: Smile,
        variant: 'default' as const,
        className: 'bg-green-100 text-green-800 hover:bg-green-100',
      },
      neutral: {
        icon: Meh,
        variant: 'secondary' as const,
        className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
      },
      negative: {
        icon: Frown,
        variant: 'destructive' as const,
        className: 'bg-red-100 text-red-800 hover:bg-red-100',
      },
    };

    const {
      icon: Icon,
      variant,
      className,
    } = config[sentiment as keyof typeof config] || config.neutral;

    return (
      <Badge variant={variant} className={`text-xs ${className}`}>
        <Icon className="mr-1 h-3 w-3" />
        {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
      </Badge>
    );
  }
);
getSentimentBadge.displayName = 'GetSentimentBadge';

// Memoized helper function to get lead quality badge
export const getLeadQualityBadge = memo(
  ({ leadQuality }: { leadQuality?: string }) => {
    if (!leadQuality) {
      return <span className="text-xs text-muted-foreground">-</span>;
    }

    const config = {
      hot: {
        icon: Flame,
        variant: 'destructive' as const,
        className: 'bg-red-100 text-red-800 hover:bg-red-100',
      },
      warm: {
        icon: Thermometer,
        variant: 'default' as const,
        className: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
      },
      cold: {
        icon: Snowflake,
        variant: 'secondary' as const,
        className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
      },
    };

    const {
      icon: Icon,
      variant,
      className,
    } = config[leadQuality as keyof typeof config] || config.cold;

    return (
      <Badge variant={variant} className={`text-xs ${className}`}>
        <Icon className="mr-1 h-3 w-3" />
        {leadQuality.charAt(0).toUpperCase() + leadQuality.slice(1)}
      </Badge>
    );
  }
);
getLeadQualityBadge.displayName = 'GetLeadQualityBadge';

export const getStatusBadge = (endedReason: string) => {
  switch (endedReason.toLowerCase()) {
    case 'customer-ended-call':
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <CheckCircle className="mr-1 h-3 w-3" />
          Completed
        </Badge>
      );
    case 'assistant-error':
    case 'error':
      return (
        <Badge variant="destructive">
          <XCircle className="mr-1 h-3 w-3" />
          Error
        </Badge>
      );
    case 'customer-did-not-give-microphone-permission':
    case 'no-answer':
      return (
        <Badge variant="secondary">
          <Phone className="mr-1 h-3 w-3" />
          No Answer
        </Badge>
      );
    case 'assistant-ended-call':
      return (
        <Badge variant="outline">
          <Phone className="mr-1 h-3 w-3" />
          Assistant Ended
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary">{endedReason.replace(/-/g, ' ')}</Badge>
      );
  }
};

// Field limits for AI settings validation
export const fieldLimits = {
  aiAssistantName: { maxLength: 25, minLength: 1 },
  yourName: { maxLength: 50, minLength: 1 },
  businessName: { maxLength: 100, minLength: 1 },
  greetingScript: { minLength: 10 },
};

export const VALIDATION_PATTERNS = {
  NAME_PATTERN: /^[\p{L}](?:[\p{L}\s\-'.])*[\p{L}]$|^[\p{L}]$/u,
  BUSINESS_NAME_PATTERN:
    /^(?!.* {2})(?!.*--)(?!.*\.{2})(?!.*,{2})(?!.*'')(?!.*&&)(?!.*\(\()(?!.*\)\))[a-zA-Z0-9](?:[a-zA-Z0-9\s\-'.,&()]*[a-zA-Z0-9.)])?$/,
};

export const validateContent = (
  field: string,
  value: string
): string | null => {
  const limits = fieldLimits[field as keyof typeof fieldLimits];

  if (value.length < limits.minLength) {
    return `Minimum ${limits.minLength} characters required`;
  }
  if ('maxLength' in limits && value.length > limits.maxLength) {
    return `Maximum ${limits.maxLength} characters allowed`;
  }

  if (contentFilter.isProfane(value)) {
    return 'Please use professional, appropriate language';
  }

  switch (field) {
    case 'aiAssistantName':
    case 'yourName':
      if (!VALIDATION_PATTERNS.NAME_PATTERN.test(value)) {
        return 'Names should only contain letters, spaces, and basic punctuation';
      }
      break;
    case 'businessName':
      if (!VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test(value)) {
        return 'Business names should only contain letters, numbers, spaces, and basic punctuation';
      }
      break;
  }
  return null;
};
