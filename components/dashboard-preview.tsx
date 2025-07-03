'use client';

import { useState, useEffect, useCallback, memo, useRef, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Phone, 
  Users, 
  TrendingUp, 
  DollarSign, 
  CheckCircle,
  XCircle,
  MoreVertical,
  BarChart3,
  Calendar,
  Clock,
  Target,
  Zap
} from "lucide-react";

// Types for better TypeScript safety
interface StatData {
  label: string;
  value: string;
  change: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'primary' | 'secondary' | 'accent' | 'emerald';
}

interface CallData {
  lead: string;
  company: string;
  value: string;
  time: string;
  status: 'qualified' | 'not-qualified';
}

interface ActivityData {
  type: string;
  message: string;
  time: string;
  variant: 'primary' | 'secondary' | 'accent' | 'emerald';
}

interface DashboardSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

// Static theme class mappings with reliable inline styles for backgrounds
const THEME_VARIANTS = {
  primary: {
    text: 'text-blue-500',
    bg: 'bg-blue-500/20', // Keep for fallback
    backgroundStyle: { backgroundColor: 'rgba(59, 130, 246, 0.2)' }, // blue-500 with 20% opacity
    border: 'border-blue-500/20',
    dot: 'bg-blue-500'
  },
  secondary: {
    text: 'text-purple-500',
    bg: 'bg-purple-500/20', // Keep for fallback  
    backgroundStyle: { backgroundColor: 'rgba(147, 51, 234, 0.2)' }, // purple-500 with 20% opacity
    border: 'border-purple-500/20',
    dot: 'bg-purple-500'
  },
  accent: {
    text: 'text-pink-500',
    bg: 'bg-pink-500/20', // Keep for fallback
    backgroundStyle: { backgroundColor: 'rgba(236, 72, 153, 0.2)' }, // pink-500 with 20% opacity
    border: 'border-pink-500/20',
    dot: 'bg-pink-500'
  },
  emerald: {
    text: 'text-emerald-500',
    bg: 'bg-emerald-500/20', // Keep for fallback
    backgroundStyle: { backgroundColor: 'rgba(16, 185, 129, 0.2)' }, // emerald-500 with 20% opacity
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-500'
  }
} as const;

// Static data with consistent theme-based classes
const STATS_DATA: StatData[] = [
  { 
    label: "Total Calls Today", 
    value: "47", 
    change: "+12%", 
    icon: Phone, 
    variant: "primary"
  },
  { 
    label: "Leads Qualified", 
    value: "32", 
    change: "+8%", 
    icon: Users, 
    variant: "secondary"
  },
  { 
    label: "Conversion Rate", 
    value: "68%", 
    change: "+5%", 
    icon: TrendingUp, 
    variant: "emerald"
  },
  { 
    label: "Revenue Impact", 
    value: "$2,847", 
    change: "+23%", 
    icon: DollarSign, 
    variant: "accent"
  }
];

const RECENT_CALLS: CallData[] = [
  { 
    lead: "John Smith",
    company: "Tech Corp",
    value: "$450",
    time: "2:34 PM",
    status: "qualified"
  },
  { 
    lead: "Sarah Johnson",
    company: "Innovation Ltd",
    value: "$320",
    time: "1:45 PM",
    status: "qualified"
  },
  { 
    lead: "Mike Wilson",
    company: "Small Biz",
    value: "$0",
    time: "12:22 PM",
    status: "not-qualified"
  },
  { 
    lead: "Emily Davis",
    company: "Growth Co",
    value: "$780",
    time: "11:15 AM",
    status: "qualified"
  }
];

const QUICK_ACTIONS = [
  { label: "Review Calls", icon: Phone },
  { label: "Export Data", icon: BarChart3 },
  { label: "Schedule Demo", icon: Calendar }
] as const;

const RECENT_ACTIVITY: ActivityData[] = [
  {
    type: "lead",
    message: "New lead qualified - John Smith from Tech Corp",
    time: "2 min ago",
    variant: "primary"
  },
  {
    type: "call", 
    message: "Call completed - 3:42 duration, qualified lead",
    time: "5 min ago",
    variant: "secondary"
  },
  {
    type: "milestone",
    message: "Performance milestone - 100 calls handled this week", 
    time: "1 hour ago",
    variant: "emerald"
  }
];

// StatCard component without memo to ensure proper re-rendering
const StatCard = ({ stat, index }: { stat: StatData; index: number }) => {
  const theme = THEME_VARIANTS[stat.variant];
  
  return (
    <Card 
      className="dashboard-preview-card p-3 bg-card/30 backdrop-blur-sm border-white/10 hover:bg-card/40 transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-2">
        <div 
          className={`card-icon-bg p-2 rounded-lg ${theme.bg}`}
        >
          <stat.icon className={`w-4 h-4 ${theme.text}`} />
        </div>
        <span className="text-green-400 text-xs font-medium">
          {stat.change}
        </span>
      </div>
      <div>
        <p className="text-lg font-bold mb-1 text-foreground">{stat.value}</p>
        <p className="text-muted-foreground text-xs">{stat.label}</p>
      </div>
    </Card>
  );
};

const CallItem = memo(({ call, index }: { call: CallData; index: number }) => (
  <div 
    className="flex items-center justify-between p-3 rounded-lg bg-card/20 hover:bg-card/30 transition-colors"
  >
    <div className="flex items-center space-x-3">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
        call.status === 'qualified' 
          ? 'bg-green-500/20 text-green-400' 
          : 'bg-red-500/20 text-red-400'
      }`}>
        {call.status === 'qualified' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{call.lead}</p>
        <p className="text-xs text-muted-foreground">{call.company}</p>
      </div>
    </div>
    
    <div className="text-right">
      <p className="text-sm font-medium text-foreground">{call.value}</p>
      <p className="text-xs text-muted-foreground">{call.time}</p>
    </div>
    
    <Button 
      variant="ghost" 
      size="icon" 
      className="w-8 h-8 hover:bg-white/10" 
      aria-label={`View details for ${call.lead}`}
    >
      <MoreVertical className="w-4 h-4" />
    </Button>
  </div>
));

CallItem.displayName = 'CallItem';

const ActivityItem = memo(({ activity, index }: { activity: ActivityData; index: number }) => {
  const theme = THEME_VARIANTS[activity.variant];
  
  return (
    <div 
      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-card/20 transition-colors"
    >
      <div className={`w-2 h-2 ${theme.dot} rounded-full`}></div>
      <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground truncate">{activity.message}</p>
      </div>
      <span className="text-xs text-muted-foreground flex-shrink-0">{activity.time}</span>
    </div>
  );
});

ActivityItem.displayName = 'ActivityItem';

const ProgressBar = memo(({ progress, isAnimating }: { progress: number; isAnimating?: boolean }) => (
  <div className="w-full bg-muted/30 rounded-full h-2">
    <div 
      className={`bg-gradient-to-r from-blue-500 to-pink-500 h-2 rounded-full transition-all duration-1000 ease-out ${
        isAnimating ? 'opacity-80' : 'opacity-100'
      }`}
      style={{ width: `${progress}%` }}
    />
  </div>
));

ProgressBar.displayName = 'ProgressBar';

// Component state type for better type safety
type ComponentState = 'idle' | 'transitioning';

export const DashboardPreview = memo(() => {
  // Centralized state management
  const [currentSection, setCurrentSection] = useState(0);
  const [componentState, setComponentState] = useState<ComponentState>('idle');
  const [progressWidth, setProgressWidth] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [overviewRefreshKey, setOverviewRefreshKey] = useState(0);
  
  // Single source of truth for all timer management
  const timerRef = useRef<{
    slideTimer: NodeJS.Timeout | null;
    progressAnimation: number | null;
    cycleId: number;
    isActive: boolean;
  }>({
    slideTimer: null,
    progressAnimation: null,
    cycleId: 0,
    isActive: false
  });
  
  // Constants - memoized for performance
  const CONSTANTS = useMemo(() => ({
    TRANSITION_INTERVAL: 4000,
    TRANSITION_DURATION: 800, // Increased for smoother transitions
    PROGRESS_UPDATE_INTERVAL: 16 // ~60fps
  }), []);

  // Track mount state to prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Memoized sections to prevent recreation
  const sections: DashboardSection[] = useMemo(() => [
    {
      id: "overview",
      title: "Dashboard Overview",
      content: (
        <div className="space-y-4 scale-75 origin-top will-change-transform">
          <div className="grid grid-cols-4 gap-3">
            {STATS_DATA.map((stat, index) => (
              <StatCard key={`${stat.label}-${overviewRefreshKey}`} stat={stat} index={index} />
            ))}
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <Card className="col-span-2 p-4 bg-card/30 backdrop-blur-sm border-white/10">
              <h3 className="text-sm font-semibold mb-3 text-foreground">Today's Overview</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Calls Handled</span>
                  <span className="font-medium text-blue-500">47/50</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Success Rate</span>
                  <span className="font-medium text-purple-500">87%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Revenue Generated</span>
                  <span className="font-medium text-emerald-500">$2,847</span>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 bg-card/30 backdrop-blur-sm border-white/10">
              <h3 className="text-sm font-semibold mb-3 text-foreground">AI Status</h3>
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-green-500">Online</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Processing calls in real-time
              </div>
            </Card>
          </div>
        </div>
      )
    },
    {
      id: "calls", 
      title: "Recent Calls",
      content: (
        <div className="space-y-4 scale-75 origin-top will-change-transform">
          <Card className="p-4 bg-card/30 backdrop-blur-sm border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Recent Calls</h3>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-green-500">Live</span>
              </div>
            </div>
            
            <div className="space-y-2">
              {RECENT_CALLS.map((call, index) => (
                <CallItem key={`${call.lead}-${call.time}`} call={call} index={index} />
              ))}
            </div>
          </Card>
        </div>
      )
    },
    {
      id: "performance",
      title: "Performance Analytics", 
      content: (
        <div className="space-y-4 scale-75 origin-top will-change-transform">
          <Card className="p-4 bg-card/30 backdrop-blur-sm border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Today's Performance</h3>
              <div className="flex items-center space-x-1">
                <TrendingUp className="h-3 w-3 text-green-400" />
                <span className="text-xs text-green-400">+18%</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Call Success Rate</span>
                  <span className="font-medium text-foreground">87%</span>
                </div>
                <ProgressBar progress={87} />
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Lead Quality</span>
                  <span className="font-medium text-foreground">73%</span>
                </div>
                <ProgressBar progress={73} />
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Response Time</span>
                  <span className="font-medium text-foreground">1.2s avg</span>
                </div>
                <ProgressBar progress={94} />
              </div>
              
              <div className="bg-pink-500/10 p-3 rounded-lg border border-pink-500/20 mt-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-pink-500 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-medium text-pink-500">AI Insight</div>
                    <div className="text-xs text-muted-foreground">Peak hours: 10 AM - 2 PM</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )
    },
    {
      id: "activity",
      title: "Recent Activity",
      content: (
        <div className="space-y-4 scale-75 origin-top will-change-transform">
          <Card className="p-4 bg-card/30 backdrop-blur-sm border-white/10">
            <h3 className="text-sm font-semibold mb-4 text-foreground">Recent Activity</h3>
            
            <div className="space-y-3">
              {RECENT_ACTIVITY.map((activity, idx) => (
                <ActivityItem key={`${activity.type}-${idx}`} activity={activity} index={idx} />
              ))}
            </div>
            
            <div className="mt-4 pt-3 border-t border-white/10">
              <h4 className="text-xs font-semibold mb-2 text-foreground">Quick Actions</h4>
              <div className="space-y-1">
                {QUICK_ACTIONS.map((action) => (
                  <Button 
                    key={action.label} 
                    variant="ghost" 
                    className="w-full justify-start h-8 text-xs hover:bg-card/20 text-foreground"
                    aria-label={action.label}
                  >
                    <action.icon className="w-3 h-3 mr-2" />
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )
    }
  ], [overviewRefreshKey]);

  // Atomic cleanup function - ensures complete state reset
  const stopAllTimers = useCallback(() => {
    const { slideTimer, progressAnimation } = timerRef.current;
    
    // Clear all timers atomically
    if (slideTimer) {
      clearTimeout(slideTimer);
    }
    if (progressAnimation) {
      cancelAnimationFrame(progressAnimation);
    }
    
    // Reset timer state atomically
    timerRef.current = {
      slideTimer: null,
      progressAnimation: null,
      cycleId: timerRef.current.cycleId + 1, // Increment to invalidate any pending callbacks
      isActive: false
    };
    
    // Reset progress immediately
    setProgressWidth(0);
  }, []);

  // Robust slide cycling with atomic state management
  const startSlideCycle = useCallback(() => {
    if (componentState !== 'idle' || sections.length === 0) return;
    
    // Stop any existing timers first
    stopAllTimers();
    
    // Create new cycle ID for this iteration
    const cycleId = timerRef.current.cycleId + 1;
    timerRef.current.cycleId = cycleId;
    timerRef.current.isActive = true;
    
    const startTime = performance.now();
    
    // Smooth progress animation using RAF
    const animateProgress = (currentTime: number) => {
      // Validate cycle is still active
      if (timerRef.current.cycleId !== cycleId || !timerRef.current.isActive) return;
      
      const elapsed = currentTime - startTime;
      const progress = Math.min((elapsed / CONSTANTS.TRANSITION_INTERVAL) * 100, 100);
      
      setProgressWidth(progress);
      
      if (progress < 100) {
        timerRef.current.progressAnimation = requestAnimationFrame(animateProgress);
      }
    };
    
    // Start progress animation
    timerRef.current.progressAnimation = requestAnimationFrame(animateProgress);
    
    // Set slide transition timer
    timerRef.current.slideTimer = setTimeout(() => {
      // Validate this timer is still the active one
      if (timerRef.current.cycleId !== cycleId || !timerRef.current.isActive) return;
      
      // Start transition
        setComponentState('transitioning');
      timerRef.current.isActive = false;
      
      // Complete transition after animation - batch state updates
        setTimeout(() => {
        // Batch all state updates together to prevent race conditions
        const nextSection = (currentSection + 1) % sections.length;
        
        // Use React's automatic batching (React 18+) by updating in same tick
        setCurrentSection(nextSection);
          setProgressWidth(0);
          setComponentState('idle');
        
        // Force StatCard re-render when cycling back to overview (slide 0)
        if (nextSection === 0) {
          setOverviewRefreshKey(prev => prev + 1);
        }
        }, CONSTANTS.TRANSITION_DURATION);
      
    }, CONSTANTS.TRANSITION_INTERVAL);
  }, [componentState, sections.length, currentSection, stopAllTimers, CONSTANTS.TRANSITION_INTERVAL, CONSTANTS.TRANSITION_DURATION]);

  // Start cycling when component becomes idle and is mounted
  useEffect(() => {
    if (componentState === 'idle' && isMounted) {
      // Small delay to ensure state is settled
      const initTimer = setTimeout(() => {
        startSlideCycle();
      }, 100);
      
      return () => clearTimeout(initTimer);
    }
    
    return stopAllTimers;
  }, [componentState, currentSection, isMounted, startSlideCycle, stopAllTimers]);

  // Handle manual section navigation
  const handleSectionChange = useCallback((newSection: number) => {
    if (newSection === currentSection || componentState === 'transitioning') {
      return;
    }
    
    // Stop current cycle immediately
    stopAllTimers();
    
    // Start transition
    setComponentState('transitioning');
    
    setTimeout(() => {
      // Batch state updates to prevent race conditions
      setCurrentSection(newSection);
      setProgressWidth(0);
      setComponentState('idle');
      
      // Force StatCard re-render when manually navigating to overview (slide 0)
      if (newSection === 0) {
        setOverviewRefreshKey(prev => prev + 1);
      }
    }, CONSTANTS.TRANSITION_DURATION);
  }, [currentSection, componentState, stopAllTimers, CONSTANTS.TRANSITION_DURATION]);

  // Cleanup on unmount
  useEffect(() => {
    return stopAllTimers;
  }, [stopAllTimers]);

  // Memoized current section data
  const currentSectionData = useMemo(() => {
    return sections[currentSection] || null;
  }, [sections, currentSection]);

  // Error boundaries
  if (sections.length === 0) {
    return (
      <div className="bg-card/20 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-lg">
        <p className="text-muted-foreground text-center">Dashboard loading...</p>
      </div>
    );
  }

  if (!currentSectionData) {
    return (
      <div className="bg-card/20 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-lg">
        <p className="text-muted-foreground text-center">Loading section...</p>
      </div>
    );
  }

  return (
    <div 
      className="bg-card/20 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-lg relative overflow-hidden max-w-4xl will-change-transform"
      style={{ contain: 'layout style paint' }}
      role="region"
      aria-label="Dashboard Preview"
      aria-live="polite"
    >
      {/* Browser header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-2" role="presentation">
            <div className="w-3 h-3 bg-red-500 rounded-full" aria-label="Close"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full" aria-label="Minimize"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full" aria-label="Live"></div>
          </div>
          <span className="text-xs text-muted-foreground ml-4">spoqen.com/dashboard</span>
        </div>
        <div className="text-xs text-blue-500 bg-blue-500/20 px-2 py-1 rounded-full">Live Dashboard</div>
      </div>

      {/* Section title with smooth transitions */}
      <div className="mb-4 overflow-hidden">
        <h3 
          className={`text-lg font-semibold ${
            isMounted ? `transition-all duration-700 ease-in-out ${
              componentState === 'transitioning' 
                ? 'opacity-0 translate-x-4' 
                : 'opacity-100 translate-x-0'
            }` : ''
          }`}
          style={isMounted ? { 
            willChange: 'opacity, transform',
            backfaceVisibility: 'hidden'
          } : {}}
          id={`section-title-${currentSection}`}
        >
          {currentSectionData.title}
        </h3>
      </div>

      {/* Navigation dots with smooth transitions */}
      <div className="flex space-x-2 mb-6" role="tablist" aria-label="Dashboard sections">
        {sections.map((section, idx) => (
          <button
            key={section.id}
            onClick={() => handleSectionChange(idx)}
            disabled={componentState === 'transitioning'}
            className={`w-2 h-2 rounded-full disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500/50 will-change-transform ${
              isMounted 
                ? `transition-all duration-500 ease-out ${
              idx === currentSection 
                ? 'bg-blue-500 scale-125 shadow-lg shadow-blue-500/30' 
                      : 'bg-muted-foreground/30 hover:bg-muted-foreground/50 hover:scale-110'
                  }`
                : idx === currentSection 
                  ? 'bg-blue-500 scale-125 shadow-lg shadow-blue-500/30' 
                  : 'bg-muted-foreground/30'
            }`}
            style={isMounted ? {
              transform: idx === currentSection ? 'scale(1.25)' : 'scale(1)',
              transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
            } : {}}
            role="tab"
            aria-selected={idx === currentSection}
            aria-label={`View ${section.title}`}
            tabIndex={componentState === 'transitioning' ? -1 : 0}
          />
        ))}
      </div>
      
      {/* Content with smooth transitions and GPU acceleration */}
      <div className="relative min-h-[400px]" style={{ contain: 'layout style' }}>
        <div 
          key={`section-${currentSection}`}
          className={`${
            isMounted ? `transition-all duration-700 ease-in-out ${
              componentState === 'transitioning' 
                ? 'opacity-0 scale-95 translate-y-2' 
                : 'opacity-100 scale-100 translate-y-0'
            }` : 'opacity-100'
          }`}
          style={isMounted ? { 
            willChange: 'opacity, transform',
            backfaceVisibility: 'hidden'
          } : {}}
          role="tabpanel"
          aria-labelledby={`section-title-${currentSection}`}
          tabIndex={-1}
        >
          {currentSectionData.content}
        </div>
      </div>

      {/* Robust progress indicator - guaranteed to start from 0 and reset cleanly */}
      <div className="absolute bottom-3 left-6 right-6" aria-hidden="true">
        <div className="w-full bg-muted/20 rounded-full h-1 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-blue-500 to-pink-500 h-1 rounded-full transition-none origin-left"
            style={{ 
              width: `${progressWidth}%`,
              transform: `scaleX(${progressWidth / 100})`,
              transformOrigin: 'left'
            }}
          />
        </div>
      </div>

      {/* GPU-accelerated glow effects */}
      <div 
        className="absolute -top-2 -right-2 w-8 h-8 bg-blue-500/10 rounded-full blur-xl pointer-events-none"
        aria-hidden="true"
      />
      <div 
        className="absolute -bottom-2 -left-2 w-6 h-6 bg-pink-500/10 rounded-full blur-lg pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
});

DashboardPreview.displayName = 'DashboardPreview'; 