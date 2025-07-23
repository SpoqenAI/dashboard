import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

// Security configuration for subscription check failures
interface SecurityConfig {
  failClosed: boolean; // If true, deny access on subscription check errors
  logErrors: boolean; // If true, log detailed error information
}

// Cache configuration for performance optimization
interface CacheConfig {
  enabled: boolean;
  ttlMs: number; // Time to live in milliseconds
  maxSize: number; // Maximum cache entries
}

// Cache entry structure
interface CacheEntry {
  hasValidSubscription: boolean;
  timestamp: number;
  userId: string;
}

// In-memory cache for subscription status (reset on server restart)
const subscriptionCache = new Map<string, CacheEntry>();

// Default to fail-closed for maximum security
const getSecurityConfig = (): SecurityConfig => ({
  failClosed: process.env.MIDDLEWARE_FAIL_CLOSED !== 'false', // Default to true unless explicitly set to false
  logErrors:
    process.env.NODE_ENV === 'development' ||
    process.env.MIDDLEWARE_LOG_ERRORS === 'true',
});

// Cache configuration
const getCacheConfig = (): CacheConfig => ({
  enabled: process.env.MIDDLEWARE_CACHE_ENABLED !== 'false', // Default to enabled
  ttlMs: parseInt(process.env.MIDDLEWARE_CACHE_TTL_MS || '30000'), // 30 seconds default
  maxSize: parseInt(process.env.MIDDLEWARE_CACHE_MAX_SIZE || '1000'), // 1000 entries max
});

// Performance monitoring
let requestCount = 0;
let cacheHits = 0;
let cacheHitRate = 0;

// Cache management functions
function getCachedSubscriptionStatus(
  userId: string,
  cacheConfig: CacheConfig
): boolean | null {
  if (!cacheConfig.enabled) return null;

  const entry = subscriptionCache.get(userId);
  if (!entry) return null;

  const isExpired = Date.now() - entry.timestamp > cacheConfig.ttlMs;
  if (isExpired) {
    subscriptionCache.delete(userId);
    return null;
  }

  cacheHits++;
  return entry.hasValidSubscription;
}

function setCachedSubscriptionStatus(
  userId: string,
  hasValidSubscription: boolean,
  cacheConfig: CacheConfig
): void {
  if (!cacheConfig.enabled) return;

  // Implement LRU cache eviction if cache is full
  if (subscriptionCache.size >= cacheConfig.maxSize) {
    const oldestKey = subscriptionCache.keys().next().value;
    if (oldestKey) {
      subscriptionCache.delete(oldestKey);
    }
  }

  subscriptionCache.set(userId, {
    hasValidSubscription,
    timestamp: Date.now(),
    userId,
  });
}

function clearExpiredCacheEntries(cacheConfig: CacheConfig): void {
  if (!cacheConfig.enabled) return;

  const now = Date.now();
  for (const [userId, entry] of subscriptionCache.entries()) {
    if (now - entry.timestamp > cacheConfig.ttlMs) {
      subscriptionCache.delete(userId);
    }
  }
}

// Performance logging
function logPerformanceMetrics(): void {
  requestCount++;

  if (requestCount > 0) {
    cacheHitRate = (cacheHits / requestCount) * 100;
  }

  // Log metrics every 100 requests in development
  if (process.env.NODE_ENV === 'development' && requestCount % 100 === 0) {
    logger.info('MIDDLEWARE_PERF', 'Performance metrics', {
      requestCount,
      cacheHits,
      cacheHitRate: `${cacheHitRate.toFixed(2)}%`,
      cacheSize: subscriptionCache.size,
    });
  }
}

export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  const securityConfig = getSecurityConfig();
  const cacheConfig = getCacheConfig();

  // Clean up expired cache entries periodically
  if (requestCount % 50 === 0) {
    clearExpiredCacheEntries(cacheConfig);
  }

  // Validate required environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const missingVars = [];
    if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseAnonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');

    const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`;

    if (securityConfig.logErrors) {
      logger.error(
        'MIDDLEWARE',
        'Middleware configuration error',
        new Error(errorMessage),
        {
          missingVars,
          requestPath: request.nextUrl.pathname,
        }
      );
    }

    return new NextResponse(
      JSON.stringify({
        error: 'Service configuration error',
        message: 'Authentication service is not properly configured.',
        code: 'MISSING_ENV_VARS',
      }),
      {
        status: 503, // Service Unavailable
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '300', // Suggest retry after 5 minutes for config issues
        },
      }
    );
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Get the current user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Route classification
  const isAuthPage = [
    '/login',
    '/signup',
    '/auth',
    '/forgot-password',
    '/reset-password',
  ].some(path => request.nextUrl.pathname.startsWith(path));
  const isPublicPage = ['/', '/privacy', '/terms', '/contact'].includes(
    request.nextUrl.pathname
  );
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
  const isOnboardingPage = request.nextUrl.pathname.startsWith('/onboarding');
  const isSettingsPage = request.nextUrl.pathname.startsWith('/settings');
  const isWelcomePage = request.nextUrl.pathname.startsWith('/welcome');
  const isDashboardPage = request.nextUrl.pathname.startsWith('/dashboard');
  const isDashboardAISettingsTab =
    isDashboardPage && request.nextUrl.searchParams.get('tab') === 'ai';

  // Allow public pages, API routes, and auth pages without authentication
  if (isPublicPage || isApiRoute || (isAuthPage && !user)) {
    logPerformanceMetrics();
    return response;
  }

  // Redirect unauthenticated users to login (except for auth pages)
  if (!user && !isAuthPage) {
    logPerformanceMetrics();
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If user is authenticated, check subscription status and welcome flow for protected routes
  if (user) {
    // Allow auth pages for authenticated users (they'll be redirected by ProtectedRoute component)
    if (isAuthPage) {
      logPerformanceMetrics();
      return response;
    }

    // Fetch user_settings.welcome_completed
    let welcomeCompleted: boolean | null = null;
    try {
      const { data: userSettings, error: userSettingsError } = await supabase
        .from('user_settings')
        .select('welcome_completed')
        .eq('id', user.id)
        .maybeSingle();
      if (userSettingsError) {
        if (securityConfig.logErrors) {
          logger.error(
            'MIDDLEWARE',
            'Error fetching user_settings',
            new Error(JSON.stringify(userSettingsError)),
            {
              userId: logger.maskUserId(user.id),
              requestPath: request.nextUrl.pathname,
            }
          );
        }
        // Treat as not completed if error
        welcomeCompleted = null;
      } else {
        welcomeCompleted = userSettings?.welcome_completed ?? null;
      }
    } catch (err) {
      if (securityConfig.logErrors) {
        logger.error(
          'MIDDLEWARE',
          'Unexpected error fetching user_settings',
          err instanceof Error ? err : new Error(String(err)),
          {
            userId: logger.maskUserId(user.id),
            requestPath: request.nextUrl.pathname,
          }
        );
      }
      welcomeCompleted = null;
    }

    // --- Welcome Flow Logic ---
    // For all protected routes (except /welcome, /settings, /login, /signup, /api/, and public pages):
    // If welcome_completed is false or null, redirect to /welcome
    const isProtectedRoute =
      !isPublicPage &&
      !isApiRoute &&
      !isAuthPage &&
      !isSettingsPage &&
      !isWelcomePage;

    if (
      isProtectedRoute &&
      (welcomeCompleted === false || welcomeCompleted === null)
    ) {
      // User has not completed welcome, redirect to /welcome
      logPerformanceMetrics();
      return NextResponse.redirect(new URL('/welcome', request.url));
    }

    // /welcome should only be accessible if welcome_completed is false/null; otherwise, redirect to /ai-configuration
    if (isWelcomePage && welcomeCompleted === true) {
      logPerformanceMetrics();
      return NextResponse.redirect(new URL('/ai-configuration', request.url));
    }

    // --- Subscription Logic ---
    try {
      // Check cache first for performance optimization
      let hasValidSubscription = getCachedSubscriptionStatus(
        user.id,
        cacheConfig
      );
      let cacheHit = hasValidSubscription !== null;

      if (!cacheHit) {
        // Check if user has an active or pending current subscription
        const { data: subscription, error } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', user.id)
          .eq('current', true)
          .in('status', ['active', 'pending_webhook'])
          .maybeSingle();

        if (error) {
          const errorMessage = `Subscription check failed: ${error.message}`;

          if (securityConfig.logErrors) {
            logger.error(
              'MIDDLEWARE',
              'Error checking subscription status',
              error instanceof Error ? error : new Error(String(error)),
              {
                userId: logger.maskUserId(user.id),
                requestPath: request.nextUrl.pathname,
                securityMode: securityConfig.failClosed
                  ? 'fail-closed'
                  : 'fail-open',
              }
            );
          }

          if (securityConfig.failClosed) {
            // Fail-closed: Deny access and return error response
            if (securityConfig.logErrors) {
              logger.warn(
                'MIDDLEWARE',
                'Access denied due to subscription check failure (fail-closed mode)',
                {
                  userId: logger.maskUserId(user.id),
                  requestPath: request.nextUrl.pathname,
                }
              );
            }

            logPerformanceMetrics();
            return new NextResponse(
              JSON.stringify({
                error: 'Access temporarily unavailable',
                message:
                  'Unable to verify subscription status. Please try again later.',
                code: 'SUBSCRIPTION_CHECK_FAILED',
              }),
              {
                status: 503, // Service Unavailable
                headers: {
                  'Content-Type': 'application/json',
                  'Retry-After': '60', // Suggest retry after 60 seconds
                },
              }
            );
          } else {
            // Fail-open: Allow access but log the issue (legacy behavior)
            if (securityConfig.logErrors) {
              logger.warn(
                'MIDDLEWARE',
                'Allowing access despite subscription check failure (fail-open mode)',
                {
                  userId: logger.maskUserId(user.id),
                  requestPath: request.nextUrl.pathname,
                }
              );
            }
            logPerformanceMetrics();
            return response;
          }
        }

        hasValidSubscription = !!subscription;

        // Cache the result for future requests
        setCachedSubscriptionStatus(user.id, hasValidSubscription, cacheConfig);
      }

      // --- /dashboard Logic ---
      if (isDashboardPage) {
        // AI settings tab is always allowed
        if (isDashboardAISettingsTab) {
          logPerformanceMetrics();
          return response;
        }
        // If user has valid subscription, allow full dashboard
        if (hasValidSubscription) {
          logPerformanceMetrics();
          return response;
        }
        // If user is free, allow but set locked=true in search params
        const url = request.nextUrl.clone();
        url.searchParams.set('locked', 'true');
        logPerformanceMetrics();
        return NextResponse.rewrite(url);
      }

      // --- Onboarding Pages ---
      if (isOnboardingPage) {
        // Legacy onboarding is deprecated; always redirect to /ai-configuration
        logPerformanceMetrics();
        return NextResponse.redirect(new URL('/ai-configuration', request.url));
      }

      // --- All Other Protected Routes ---
      if (isProtectedRoute) {
        // If user has valid subscription, allow
        if (hasValidSubscription) {
          logPerformanceMetrics();
          return response;
        }
        // If user is free, redirect to onboarding/profile (legacy fallback)
        logPerformanceMetrics();
        return NextResponse.redirect(new URL('/welcome', request.url));
      }
    } catch (error) {
      const errorMessage = `Middleware error: ${error instanceof Error ? error.message : 'Unknown error'}`;

      if (securityConfig.logErrors) {
        logger.error(
          'MIDDLEWARE',
          'Unexpected middleware error',
          error instanceof Error ? error : new Error(String(error)),
          {
            userId: logger.maskUserId(user.id),
            requestPath: request.nextUrl.pathname,
            securityMode: securityConfig.failClosed
              ? 'fail-closed'
              : 'fail-open',
          }
        );
      }

      if (securityConfig.failClosed) {
        // Fail-closed: Deny access on unexpected errors
        if (securityConfig.logErrors) {
          logger.warn(
            'MIDDLEWARE',
            'Access denied due to unexpected middleware error (fail-closed mode)',
            {
              userId: logger.maskUserId(user.id),
              requestPath: request.nextUrl.pathname,
            }
          );
        }

        logPerformanceMetrics();
        return new NextResponse(
          JSON.stringify({
            error: 'Access temporarily unavailable',
            message: 'System temporarily unavailable. Please try again later.',
            code: 'MIDDLEWARE_ERROR',
          }),
          {
            status: 503, // Service Unavailable
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '120', // Suggest retry after 2 minutes for unexpected errors
            },
          }
        );
      } else {
        // Fail-open: Allow access but log (legacy behavior)
        if (securityConfig.logErrors) {
          logger.warn(
            'MIDDLEWARE',
            'Allowing access despite unexpected middleware error (fail-open mode)',
            {
              userId: logger.maskUserId(user.id),
              requestPath: request.nextUrl.pathname,
            }
          );
        }
        logPerformanceMetrics();
        return response;
      }
    }
  }

  logPerformanceMetrics();
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
