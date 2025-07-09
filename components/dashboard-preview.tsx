'use client';

import { useState, useEffect, useCallback, memo, useRef, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Zap,
} from 'lucide-react';

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
    dot: 'bg-blue-500',
  },
  secondary: {
    text: 'text-purple-500',
    bg: 'bg-purple-500/20', // Keep for fallback
    backgroundStyle: { backgroundColor: 'rgba(147, 51, 234, 0.2)' }, // purple-500 with 20% opacity
    border: 'border-purple-500/20',
    dot: 'bg-purple-500',
  },
  accent: {
    text: 'text-pink-500',
    bg: 'bg-pink-500/20', // Keep for fallback
    backgroundStyle: { backgroundColor: 'rgba(236, 72, 153, 0.2)' }, // pink-500 with 20% opacity
    border: 'border-pink-500/20',
    dot: 'bg-pink-500',
  },
  emerald: {
    text: 'text-emerald-500',
    bg: 'bg-emerald-500/20', // Keep for fallback
    backgroundStyle: { backgroundColor: 'rgba(16, 185, 129, 0.2)' }, // emerald-500 with 20% opacity
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
} as const;

// Static data with consistent theme-based classes
const STATS_DATA: StatData[] = [
  {
    label: 'Total Calls Today',
    value: '47',
    change: '+12%',
    icon: Phone,
    variant: 'primary',
  },
  {
    label: 'Leads Qualified',
    value: '32',
    change: '+8%',
    icon: Users,
    variant: 'secondary',
  },
  {
    label: 'Conversion Rate',
    value: '68%',
    change: '+5%',
    icon: TrendingUp,
    variant: 'emerald',
  },
  {
    label: 'Revenue Impact',
    value: '$2,847',
    change: '+23%',
    icon: DollarSign,
    variant: 'accent',
  },
];

const RECENT_CALLS: CallData[] = [
  {
    lead: 'John Smith',
    company: 'Tech Corp',
    value: '$450',
    time: '2:34 PM',
    status: 'qualified',
  },
  {
    lead: 'Sarah Johnson',
    company: 'Innovation Ltd',
    value: '$320',
    time: '1:45 PM',
    status: 'qualified',
  },
  {
    lead: 'Mike Wilson',
    company: 'Small Biz',
    value: '$0',
    time: '12:22 PM',
    status: 'not-qualified',
  },
  {
    lead: 'Emily Davis',
    company: 'Growth Co',
    value: '$780',
    time: '11:15 AM',
    status: 'qualified',
  },
];

const QUICK_ACTIONS = [
  { label: 'Review Calls', icon: Phone },
  { label: 'Export Data', icon: BarChart3 },
  { label: 'Schedule Demo', icon: Calendar },
] as const;

const RECENT_ACTIVITY: ActivityData[] = [
  {
    type: 'lead',
    message: 'New lead qualified - John Smith from Tech Corp',
    time: '2 min ago',
    variant: 'primary',
  },
  {
    type: 'call',
    message: 'Call completed - 3:42 duration, qualified lead',
    time: '5 min ago',
    variant: 'secondary',
  },
  {
    type: 'milestone',
    message: 'Performance milestone - 100 calls handled this week',
    time: '1 hour ago',
    variant: 'emerald',
  },
];

// StatCard component without memo to ensure proper re-rendering
const StatCard = ({
  stat,
  _index,
  _isDark,
}: {
  stat: StatData;
  _index: number;
  _isDark: boolean;
}) => {
  const theme = THEME_VARIANTS[stat.variant];

  return (
    <Card className="dashboard-preview-card p-3 backdrop-blur-sm transition-all duration-300">
      <div className="mb-2 flex items-center justify-between">
        <div className={`card-icon-bg rounded-lg p-2 ${theme.bg}`}>
          <stat.icon className={`h-4 w-4 ${theme.text}`} />
        </div>
        <span className="text-xs font-medium text-green-400">
          {stat.change}
        </span>
      </div>
      <div>
        <p className="mb-1 text-lg font-bold text-foreground">{stat.value}</p>
        <p className="text-xs text-muted-foreground">{stat.label}</p>
      </div>
    </Card>
  );
};

const CallItem = memo(
  ({ call }: { call: CallData }) => (
    <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3 transition-colors">
      <div className="flex items-center space-x-3">
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full ${
            call.status === 'qualified'
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
          }`}
        >
          {call.status === 'qualified' ? (
            <CheckCircle className="h-3 w-3" />
          ) : (
            <XCircle className="h-3 w-3" />
          )}
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
        className="h-8 w-8 hover:bg-muted/30"
        aria-label={`View details for ${call.lead}`}
      >
        <MoreVertical className="h-4 w-4" />
      </Button>
    </div>
  )
);

CallItem.displayName = 'CallItem';

const ActivityItem = memo(
  ({
    activity,
    index,
    isDark,
  }: {
    activity: ActivityData;
    index: number;
    isDark: boolean;
  }) => {
    const theme = THEME_VARIANTS[activity.variant];

    return (
      <div className="flex items-center space-x-3 rounded-lg p-2 transition-colors hover:bg-muted/30">
        <div className={`h-2 w-2 ${theme.dot} rounded-full`}></div>
        <Clock className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-foreground">{activity.message}</p>
        </div>
        <span className="flex-shrink-0 text-xs text-muted-foreground">
          {activity.time}
        </span>
      </div>
    );
  }
);

ActivityItem.displayName = 'ActivityItem';

const ProgressBar = memo(
  ({ progress, isAnimating }: { progress: number; isAnimating?: boolean }) => (
    <div className="h-2 w-full rounded-full bg-muted/30">
      <div
        className={`h-2 rounded-full bg-gradient-to-r from-blue-500 to-pink-500 transition-all duration-1000 ease-out ${
          isAnimating ? 'opacity-80' : 'opacity-100'
        }`}
        style={{ width: `${progress}%` }}
      />
    </div>
  )
);

ProgressBar.displayName = 'ProgressBar';

// Component state type for better type safety
type ComponentState = 'idle' | 'transitioning';

export const DashboardPreview = memo(() => {
  // Theme awareness
  const { theme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

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
    isActive: false,
  });

  // Constants - memoized for performance
  const CONSTANTS = useMemo(
    () => ({
      TRANSITION_INTERVAL: 4000,
      TRANSITION_DURATION: 800, // Increased for smoother transitions
      PROGRESS_UPDATE_INTERVAL: 16, // ~60fps
    }),
    []
  );

  // Track mount state to prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Memoized sections to prevent recreation
  const sections: DashboardSection[] = useMemo(
    () => [
      {
        id: 'overview',
        title: 'Dashboard Overview',
        content: (
          <div className="origin-top scale-75 space-y-4 will-change-transform">
            <div className="grid grid-cols-4 gap-3">
              {STATS_DATA.map((stat, index) => (
                <StatCard
                  key={`${stat.label}-${overviewRefreshKey}`}
                  stat={stat}
                  _index={index}
                  _isDark={isDark}
                />
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Card className="col-span-2 p-4 backdrop-blur-sm">
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  Today's Overview
                </h3>
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
                    <span className="text-muted-foreground">
                      Revenue Generated
                    </span>
                    <span className="font-medium text-emerald-500">$2,847</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4 backdrop-blur-sm">
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  AI Status
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span className="text-xs text-muted-foreground">
                      Online
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Utilization</span>
                      <span className="text-green-400">94%</span>
                    </div>
                    <ProgressBar progress={94} />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        ),
      },
      {
        id: 'calls',
        title: 'Recent Calls',
        content: (
          <div className="origin-top scale-75 space-y-4 will-change-transform">
            <Card className="p-4 backdrop-blur-sm">
              <h3 className="mb-4 text-sm font-semibold text-foreground">
                Recent Calls
              </h3>
              <div className="space-y-3">
                {RECENT_CALLS.map((call, index) => (
                  <CallItem
                    key={`${call.lead}-${index}`}
                    call={call}
                  />
                ))}
              </div>
            </Card>
          </div>
        ),
      },
      {
        id: 'analytics',
        title: 'Analytics Dashboard',
        content: (
          <div className="origin-top scale-75 space-y-4 will-change-transform">
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 backdrop-blur-sm">
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  Performance
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">
                      Success Rate
                    </span>
                    <span className="text-xs font-medium text-emerald-500">
                      87%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted/50">
                    <div
                      className="h-2 w-[87%] rounded-full bg-emerald-500"
                      style={{ width: '87%' }}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        Avg. Duration
                      </span>
                      <span className="text-foreground">4:23</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        Satisfaction
                      </span>
                      <span className="text-foreground">4.8/5</span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-4 backdrop-blur-sm">
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  Revenue Impact
                </h3>
                <div className="space-y-2">
                  <div className="text-center">
                    <div className="text-xl font-bold text-emerald-500">
                      $2,847
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Generated Today
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <div className="rounded-full bg-emerald-500/20 p-2">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        ),
      },
      {
        id: 'activity',
        title: 'Activity Stream',
        content: (
          <div className="origin-top scale-75 space-y-4 will-change-transform">
            <Card className="p-4 backdrop-blur-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  Live Activity
                </h3>
                <div className="flex items-center space-x-1">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
                  <span className="text-xs text-muted-foreground">Live</span>
                </div>
              </div>
              <div className="space-y-2 border-t border-border pt-3">
                {RECENT_ACTIVITY.map((activity, index) => (
                  <ActivityItem
                    key={`${activity.type}-${index}`}
                    activity={activity}
                    index={index}
                    isDark={isDark}
                  />
                ))}
              </div>
              <div className="mt-3 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs hover:bg-muted/30"
                >
                  View All Activity
                </Button>
              </div>
            </Card>
          </div>
        ),
      },
    ],
    [isDark, overviewRefreshKey]
  );

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
      isActive: false,
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
      if (timerRef.current.cycleId !== cycleId || !timerRef.current.isActive)
        return;

      const elapsed = currentTime - startTime;
      const progress = Math.min(
        (elapsed / CONSTANTS.TRANSITION_INTERVAL) * 100,
        100
      );

      setProgressWidth(progress);

      if (progress < 100) {
        timerRef.current.progressAnimation =
          requestAnimationFrame(animateProgress);
      }
    };

    // Start progress animation
    timerRef.current.progressAnimation = requestAnimationFrame(animateProgress);

    // Set slide transition timer
    timerRef.current.slideTimer = setTimeout(() => {
      // Validate this timer is still the active one
      if (timerRef.current.cycleId !== cycleId || !timerRef.current.isActive)
        return;

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
  }, [
    componentState,
    sections.length,
    currentSection,
    stopAllTimers,
    CONSTANTS.TRANSITION_INTERVAL,
    CONSTANTS.TRANSITION_DURATION,
  ]);

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
  }, [
    componentState,
    currentSection,
    isMounted,
    startSlideCycle,
    stopAllTimers,
  ]);

  // Handle manual section navigation
  const handleSectionChange = useCallback(
    (newSection: number) => {
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
    },
    [
      currentSection,
      componentState,
      stopAllTimers,
      CONSTANTS.TRANSITION_DURATION,
    ]
  );

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
      <div
        className="rounded-2xl border border-border bg-card/60 p-6 shadow-lg backdrop-blur-sm"
        suppressHydrationWarning
      >
        <p className="text-center text-muted-foreground">
          Dashboard loading...
        </p>
      </div>
    );
  }

  if (!currentSectionData) {
    return (
      <div
        className="rounded-2xl border border-border bg-card/60 p-6 shadow-lg backdrop-blur-sm"
        suppressHydrationWarning
      >
        <p className="text-center text-muted-foreground">Loading section...</p>
      </div>
    );
  }

  return (
    <div
      className="relative max-w-4xl overflow-hidden rounded-2xl border border-border bg-card/60 p-6 shadow-lg backdrop-blur-sm will-change-transform"
      style={{ contain: 'layout style paint' }}
      role="region"
      aria-label="Dashboard Preview"
      aria-live="polite"
      suppressHydrationWarning
    >
      {/* Section title with smooth transitions */}
      <div className="mb-4 overflow-hidden">
        <h3
          className={`text-lg font-semibold ${
            isMounted
              ? `transition-all duration-700 ease-in-out ${
                  componentState === 'transitioning'
                    ? 'translate-x-4 opacity-0'
                    : 'translate-x-0 opacity-100'
                }`
              : ''
          }`}
          style={
            isMounted
              ? {
                  willChange: 'opacity, transform',
                  backfaceVisibility: 'hidden',
                }
              : {}
          }
          id={`section-title-${currentSection}`}
        >
          {currentSectionData.title}
        </h3>
      </div>

      {/* Navigation dots with smooth transitions */}
      <div
        className="mb-6 flex space-x-2"
        role="tablist"
        aria-label="Dashboard sections"
      >
        {sections.map((section, idx) => (
          <button
            key={section.id}
            onClick={() => handleSectionChange(idx)}
            disabled={componentState === 'transitioning'}
            className={`h-2 w-2 rounded-full will-change-transform focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:cursor-not-allowed ${
              isMounted
                ? `transition-all duration-500 ease-out ${
                    idx === currentSection
                      ? 'scale-125 bg-blue-500 shadow-lg shadow-blue-500/30'
                      : 'bg-muted-foreground/30 hover:scale-110 hover:bg-muted-foreground/50'
                  }`
                : idx === currentSection
                  ? 'scale-125 bg-blue-500 shadow-lg shadow-blue-500/30'
                  : 'bg-muted-foreground/30'
            }`}
            style={
              isMounted
                ? {
                    transform:
                      idx === currentSection ? 'scale(1.25)' : 'scale(1)',
                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  }
                : {}
            }
            role="tab"
            aria-selected={idx === currentSection}
            aria-label={`View ${section.title}`}
            tabIndex={componentState === 'transitioning' ? -1 : 0}
          />
        ))}
      </div>

      {/* Content with smooth transitions and GPU acceleration */}
      <div
        className="relative min-h-[400px]"
        style={{ contain: 'layout style' }}
      >
        <div
          key={`section-${currentSection}`}
          className={`${
            isMounted
              ? `transition-all duration-700 ease-in-out ${
                  componentState === 'transitioning'
                    ? 'translate-y-2 scale-95 opacity-0'
                    : 'translate-y-0 scale-100 opacity-100'
                }`
              : 'opacity-100'
          }`}
          style={
            isMounted
              ? {
                  willChange: 'opacity, transform',
                  backfaceVisibility: 'hidden',
                }
              : {}
          }
          role="tabpanel"
          aria-labelledby={`section-title-${currentSection}`}
          tabIndex={-1}
        >
          {currentSectionData.content}
        </div>
      </div>

      {/* Robust progress indicator - guaranteed to start from 0 and reset cleanly */}
      <div className="absolute bottom-3 left-6 right-6" aria-hidden="true">
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted/20">
          <div
            className="h-1 origin-left rounded-full bg-gradient-to-r from-blue-500 to-pink-500 transition-none"
            style={{
              width: `${progressWidth}%`,
              transform: `scaleX(${progressWidth / 100})`,
              transformOrigin: 'left',
            }}
          />
        </div>
      </div>

      {/* GPU-accelerated glow effects */}
      <div
        className="pointer-events-none absolute -right-2 -top-2 h-8 w-8 rounded-full bg-blue-500/10 blur-xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-2 -left-2 h-6 w-6 rounded-full bg-pink-500/10 blur-lg"
        aria-hidden="true"
      />
    </div>
  );
});

DashboardPreview.displayName = 'DashboardPreview';
