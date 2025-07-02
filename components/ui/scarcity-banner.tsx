import { useState, useEffect } from 'react';
import { X, Clock, TrendingUp } from 'lucide-react';
import { Button } from './button';
import { trackEvent } from '@/lib/analytics-tracking';

interface ScarcityBannerProps {
  type?: 'limited_time' | 'social_proof' | 'countdown';
  message?: string;
  ctaText?: string;
  ctaLink?: string;
  autoHide?: boolean;
  duration?: number;
}

export const ScarcityBanner = ({
  type = 'limited_time',
  message,
  ctaText = 'Claim Now',
  ctaLink = '/signup',
  autoHide = true,
  duration = 30000 // 30 seconds
}: ScarcityBannerProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [timeLeft, setTimeLeft] = useState(duration / 1000);

  useEffect(() => {
    if (!autoHide) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsVisible(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoHide]);

  const handleClose = () => {
    setIsVisible(false);
    trackEvent('scarcity_banner_closed', { type, manual: true });
  };

  const handleCTAClick = () => {
    trackEvent('scarcity_banner_cta_clicked', { type, ctaText });
  };

  if (!isVisible) return null;

  const getDefaultMessage = () => {
    switch (type) {
      case 'social_proof':
        return '🔥 47 people signed up in the last hour';
      case 'countdown':
        return '⚡ Special launch pricing ends soon';
      case 'limited_time':
      default:
        return '🎯 Limited time: Get 3 months free with annual plan';
    }
  };

  const displayMessage = message || getDefaultMessage();

  return (
    <aside 
      className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-[calc(100%-2rem)] max-w-2xl rounded-lg bg-card/20 backdrop-blur-glass border border-white/10 text-foreground shadow-lg animate-slide-down" 
      role="region" 
      aria-label="Limited time promotion banner"
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {type === 'countdown' && (
              <div className="flex items-center space-x-1 bg-white/20 rounded-full px-3 py-1" aria-live="polite">
                <Clock className="w-4 h-4" aria-hidden="true" />
                <span className="text-sm font-medium" aria-label="Time left">
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>
            )}
            {type === 'social_proof' && (
              <TrendingUp className="w-5 h-5 text-white/90" />
            )}
            <span className="text-sm sm:text-base font-medium">
              {displayMessage}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="neon"
              size="sm"
              className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              asChild
            >
              <a href={ctaLink} onClick={handleCTAClick}>
                {ctaText}
              </a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 p-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={handleClose}
              aria-label="Close banner"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
};

// Keyframe for slide down animation (add to globals.css)
export const scarcityBannerStyles = `
@keyframes slide-down {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.animate-slide-down {
  animation: slide-down 0.3s ease-out;
}
`; 