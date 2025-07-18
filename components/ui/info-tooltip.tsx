import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface InfoTooltipProps {
  content: string;
  className?: string;
  maxWidth?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
}

export function InfoTooltip({
  content,
  className = '',
  maxWidth = 'max-w-xs',
  side = 'top',
  align = 'center',
}: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  // Mobile-optimized positioning
  const mobileProps = isMobile
    ? {
        side: 'bottom' as const,
        align: 'center' as const,
        collisionPadding: 16,
        sideOffset: 8,
      }
    : {
        side,
        align,
        collisionPadding: 8,
        sideOffset: 4,
      };

  return (
    <TooltipProvider>
      <Tooltip open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-pink-500 transition-colors hover:text-pink-600 focus:text-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-1 ${className}`}
            onClick={() => setIsOpen(!isOpen)}
            onMouseEnter={() => !isMobile && setIsOpen(true)}
            onMouseLeave={() => !isMobile && setIsOpen(false)}
            aria-label="More information"
          >
            <Info className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          className={`${isMobile ? 'max-w-[calc(100vw-2rem)]' : maxWidth} z-[9999] border bg-popover text-popover-foreground shadow-lg`}
          {...mobileProps}
          avoidCollisions={true}
          onPointerDownOutside={() => setIsOpen(false)}
          onEscapeKeyDown={() => setIsOpen(false)}
        >
          <div className={`${isMobile ? 'max-h-[50vh] overflow-y-auto' : ''}`}>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {content}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
