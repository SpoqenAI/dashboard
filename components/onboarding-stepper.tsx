import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Step {
  id: string;
  name: string;
  description: string;
}

interface OnboardingStepperProps {
  currentStep: string;
  className?: string;
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
];

export function OnboardingStepper({
  currentStep,
  className,
}: OnboardingStepperProps) {
  const currentIndex = steps.findIndex(step => step.id === currentStep);

  // Handle invalid currentStep by defaulting to first step
  const safeCurrentIndex = currentIndex === -1 ? 0 : currentIndex;

  return (
    <nav aria-label="Progress" className={cn('mb-8', className)}>
      <ol role="list" className="flex items-center justify-center space-x-5">
        {steps.map((step, index) => {
          const isCompleted = index < safeCurrentIndex;
          const isCurrent = step.id === currentStep;
          const isUpcoming = index > safeCurrentIndex;

          return (
            <li key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full border-2',
                    {
                      'border-primary bg-primary text-primary-foreground':
                        isCurrent || isCompleted,
                      'border-muted-foreground bg-background text-muted-foreground':
                        isUpcoming,
                    }
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <div className="mt-2 text-center">
                  <div
                    className={cn('text-sm font-medium', {
                      'text-primary': isCurrent || isCompleted,
                      'text-muted-foreground': isUpcoming,
                    })}
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
                  className={cn('mx-4 h-0.5 w-16', {
                    'bg-primary': index < safeCurrentIndex,
                    'bg-muted': index >= safeCurrentIndex,
                  })}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
