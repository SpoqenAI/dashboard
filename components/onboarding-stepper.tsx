import { cn } from '@/lib/utils';
import { Check, Loader2 } from 'lucide-react';

interface Step {
  id: string;
  name: string;
  description: string;
}

interface OnboardingStepperProps {
  currentStep: string;
  className?: string;
  isProcessing?: boolean;
}

const steps: Step[] = [
  {
    id: 'profile',
    name: 'Profile',
    description: 'Basic information',
  },
  {
    id: 'assistant',
    name: 'Assistant',
    description: 'AI setup',
  },
  {
    id: 'subscribe',
    name: 'Subscribe',
    description: 'Choose your plan',
  },
  {
    id: 'processing',
    name: 'Complete',
    description: 'Finalizing setup',
  },
];

export function OnboardingStepper({
  currentStep,
  className,
  isProcessing = false,
}: OnboardingStepperProps) {
  const currentIndex = steps.findIndex(step => step.id === currentStep);

  // Handle invalid currentStep by defaulting to first step
  const safeCurrentIndex = currentIndex === -1 ? 0 : currentIndex;

  return (
    <nav
      aria-label="Onboarding progress"
      className={cn('mb-8', className)}
      role="progressbar"
      aria-valuenow={safeCurrentIndex + 1}
      aria-valuemin={1}
      aria-valuemax={steps.length}
      aria-valuetext={`Step ${safeCurrentIndex + 1} of ${steps.length}: ${steps[safeCurrentIndex]?.name}`}
    >
      <ol role="list" className="flex items-center justify-center space-x-5">
        {steps.map((step, index) => {
          const isCompleted = index < safeCurrentIndex;
          const isCurrent = step.id === currentStep;
          const isUpcoming = index > safeCurrentIndex;
          const isProcessingStep =
            step.id === 'processing' && isCurrent && isProcessing;

          return (
            <li key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300',
                    {
                      'border-primary bg-primary text-primary-foreground':
                        isCurrent || isCompleted,
                      'border-muted-foreground bg-background text-muted-foreground':
                        isUpcoming,
                      'border-green-500 bg-green-500 text-white':
                        isCompleted && !isCurrent,
                      'animate-pulse border-blue-500 bg-blue-500 text-white':
                        isProcessingStep,
                    }
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={`${step.name}: ${isCompleted ? 'completed' : isCurrent ? 'current' : 'upcoming'}`}
                >
                  {isCompleted && !isCurrent ? (
                    <Check className="h-5 w-5" aria-hidden="true" />
                  ) : isProcessingStep ? (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <span className="text-sm font-medium" aria-hidden="true">
                      {index + 1}
                    </span>
                  )}
                </div>
                <div className="mt-2 max-w-20 text-center">
                  <div
                    className={cn(
                      'text-sm font-medium transition-colors duration-300',
                      {
                        'text-primary': isCurrent,
                        'text-green-600': isCompleted && !isCurrent,
                        'text-muted-foreground': isUpcoming,
                      }
                    )}
                  >
                    {step.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {step.description}
                  </div>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'mx-4 h-0.5 w-16 transition-colors duration-300',
                    {
                      'bg-green-500': index < safeCurrentIndex,
                      'bg-primary': index < safeCurrentIndex && isCurrent,
                      'bg-muted': index >= safeCurrentIndex,
                    }
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Screen reader only completion percentage */}
      <div className="sr-only" aria-live="polite">
        {isProcessing
          ? `Processing your account setup. Please wait.`
          : `${Math.round(((safeCurrentIndex + 1) / steps.length) * 100)}% complete`}
      </div>
    </nav>
  );
}
