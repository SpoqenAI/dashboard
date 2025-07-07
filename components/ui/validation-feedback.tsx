import { CheckCircle, AlertCircle } from 'lucide-react';

interface ValidationFeedbackProps {
  isValid: boolean;
  isValidating: boolean;
  message: string;
  showOnValid?: boolean;
}

export const ValidationFeedback = ({
  isValid,
  isValidating,
  message,
  showOnValid = false,
}: ValidationFeedbackProps) => {
  if (isValidating) {
    return (
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span>Checking...</span>
      </div>
    );
  }

  if (isValid && showOnValid) {
    return (
      <div className="flex items-center space-x-2 text-sm text-green-600">
        <CheckCircle className="h-4 w-4" />
        <span>Looks good!</span>
      </div>
    );
  }

  if (!isValid && message) {
    return (
      <div className="flex items-center space-x-2 text-sm text-red-600">
        <AlertCircle className="h-4 w-4" />
        <span>{message}</span>
      </div>
    );
  }

  return null;
};
