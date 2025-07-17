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
}

export function InfoTooltip({ content, className = '', maxWidth = 'max-w-xs' }: InfoTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info 
            className={`h-4 w-4 text-pink-500 hover:text-pink-600 cursor-help transition-colors ${className}`}
          />
        </TooltipTrigger>
        <TooltipContent className={maxWidth}>
          <p className="text-sm">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}