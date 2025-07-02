import { useState, useEffect, useCallback } from 'react';
import { X, Gift, Clock, ArrowRight } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { trackEvent } from '@/lib/analytics-tracking';

interface ExitIntentModalProps {
  title?: string;
  subtitle?: string;
  offer?: string;
  ctaText?: string;
  ctaLink?: string;
  incentive?: string;
  onClose?: () => void;
}

export const ExitIntentModal = ({
  title = "Wait! Don't Miss Out",
  subtitle = "Before you go, grab this exclusive offer",
  offer = "50% OFF",
  ctaText = "Claim My Discount",
  ctaLink = "/signup?discount=50",
  incentive = "Join 2,847+ founders already using Spoqen",
  onClose
}: ExitIntentModalProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // PERFORMANCE: Debounced mouse tracking
  const handleMouseMove = useCallback((e: MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  }, []);

  // Exit intent detection
  const handleMouseLeave = useCallback((e: MouseEvent) => {
    // Only trigger if:
    // 1. Mouse is moving toward browser controls (top edge)
    // 2. Near the top of the screen
    // 3. Modal hasn't been shown yet
    if (
      e.clientY <= 5 && 
      !hasShown && 
      window.pageYOffset > 50 &&
      document.hasFocus()
    ) {
      setIsVisible(true);
      setHasShown(true);
      trackEvent('exit_intent_triggered', {
        timeOnPage: (Date.now() - (window as any).pageLoadTime) / 1000,
        scrollDepth: (window.pageYOffset / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      });
    }
  }, [hasShown]);

  // Alternative triggers for mobile (scroll-based)
  const handleScroll = useCallback(() => {
    const scrollPercent = (window.pageYOffset / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
    
    // Trigger on mobile if user scrolls back up significantly after reading 50%+
    if (
      !hasShown &&
      scrollPercent > 30 &&
      window.pageYOffset < (window as any).lastScrollPosition - 150 &&
      'ontouchstart' in window
    ) {
      setIsVisible(true);
      setHasShown(true);
      trackEvent('exit_intent_triggered_mobile', {
        scrollPercent,
        trigger: 'scroll_up'
      });
    }
    
    (window as any).lastScrollPosition = window.pageYOffset;
  }, [hasShown]);

  useEffect(() => {
    // Initialize page load time
    (window as any).pageLoadTime = Date.now();
    (window as any).lastScrollPosition = 0;

    // Only add listeners if not already shown
    if (!hasShown) {
      // Desktop exit intent
      document.addEventListener('mouseleave', handleMouseLeave);
      document.addEventListener('mousemove', handleMouseMove);
      
      // Mobile scroll-based intent
      window.addEventListener('scroll', handleScroll, { passive: true });
      
      // Time-based fallback (show after 1 minute of engagement)
      const fallbackTimer = setTimeout(() => {
        if (!hasShown && window.pageYOffset > 200) {
          setIsVisible(true);
          setHasShown(true);
          trackEvent('exit_intent_triggered', { trigger: 'time_based' });
        }
      }, 60000); // 1 minute

      // Inactivity trigger – 30 s of no interaction after some scroll
      let idleTimer: NodeJS.Timeout;
      const resetIdleTimer = () => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          if (!hasShown && window.pageYOffset > 200) {
            setIsVisible(true);
            setHasShown(true);
            trackEvent('exit_intent_triggered', { trigger: 'idle_timeout' });
          }
        }, 30000);
      };
      // Consider scroll & mouse movement as activity
      document.addEventListener('mousemove', resetIdleTimer);
      window.addEventListener('scroll', resetIdleTimer);
      resetIdleTimer();

      // Visibility change (tab switching)
      const handleVisibilityChange = () => {
        if (document.hidden && !hasShown) {
          setIsVisible(true);
          setHasShown(true);
          trackEvent('exit_intent_triggered', { trigger: 'tab_switch' });
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        document.removeEventListener('mouseleave', handleMouseLeave);
        document.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('scroll', handleScroll);
        clearTimeout(fallbackTimer);
        clearTimeout(idleTimer);
        document.removeEventListener('mousemove', resetIdleTimer);
        window.removeEventListener('scroll', resetIdleTimer);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [hasShown, handleMouseLeave, handleMouseMove, handleScroll]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    trackEvent('exit_intent_closed', { action: 'manual_close' });
    onClose?.();
  }, [onClose]);

  const handleCTAClick = useCallback(() => {
    trackEvent('exit_intent_cta_clicked', { 
      offer,
      ctaText,
      timeVisible: Date.now() - (window as any).exitIntentShowTime
    });
  }, [offer, ctaText]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  useEffect(() => {
    if (isVisible) {
      (window as any).exitIntentShowTime = Date.now();
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-intent-title"
    >
      <Card className="relative w-full max-w-md mx-4 bg-card/20 backdrop-blur-glass border border-white/10 animate-slide-up">
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 h-6 w-6 p-0 hover:bg-muted"
          onClick={handleClose}
          aria-label="Close offer"
        >
          <X className="h-4 w-4" />
        </Button>

        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/20 rounded-full">
              <Gift className="w-8 h-8 text-primary" />
            </div>
          </div>
          
          <CardTitle id="exit-intent-title" className="text-2xl font-bold">
            {title}
          </CardTitle>
          
          <p className="text-muted-foreground mt-2">
            {subtitle}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Offer highlight */}
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-gradient-primary text-white px-6 py-3 rounded-full text-2xl font-bold">
              <span>{offer}</span>
              <Clock className="w-6 h-6" />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              For first-time customers only
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>14-day free trial included</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Setup in under 5 minutes</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Cancel anytime, no questions asked</span>
            </div>
          </div>

          {/* Social proof */}
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-sm text-muted-foreground">
              {incentive}
            </p>
          </div>

          {/* CTA */}
          <div className="space-y-3">
            <Button 
              variant="neon"
              className="w-full"
              size="lg"
              asChild
            >
              <a href={ctaLink} onClick={handleCTAClick}>
                {ctaText}
                <ArrowRight className="ml-2 w-4 h-4" />
              </a>
            </Button>
            
            <button 
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={handleClose}
            >
              No thanks, I'll pay full price
            </button>
          </div>

          {/* Urgency text */}
          <p className="text-xs text-center text-muted-foreground">
            ⚡ This offer expires when you leave the page
          </p>
        </CardContent>
      </Card>
    </div>
  );
}; 