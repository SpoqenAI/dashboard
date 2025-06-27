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
function getCachedSubscriptionStatus(userId: string, cacheConfig: CacheConfig): boolean | null {
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

function setCachedSubscriptionStatus(userId: string, hasValidSubscription: boolean, cacheConfig: CacheConfig): void {
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

  // If user is authenticated, check subscription status for protected routes
  if (user) {
    // Allow auth pages for authenticated users (they'll be redirected by ProtectedRoute component)
    if (isAuthPage) {
      logPerformanceMetrics();
      return response;
    }

    try {
      // Check cache first for performance optimization
      let hasValidSubscription = getCachedSubscriptionStatus(user.id, cacheConfig);
      let cacheHit = hasValidSubscription !== null;

      if (!cacheHit) {
        // Check if user has an active or pending subscription
        const { data: subscription, error } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', user.id)
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

      // Performance logging with cache metrics
      const processingTime = Date.now() - startTime;
      if (securityConfig.logErrors && processingTime > 100) {
        logger.warn('MIDDLEWARE_PERF', 'Slow middleware response', {
          userId: logger.maskUserId(user.id),
          processingTimeMs: processingTime,
          cacheHit,
          requestPath: request.nextUrl.pathname,
        });
      }

      // If user has valid subscription (active or pending webhook)
      if (hasValidSubscription) {
        // Redirect away from onboarding pages to main dashboard
        if (isOnboardingPage) {
          logPerformanceMetrics();
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
        // Allow access to all other pages
        logPerformanceMetrics();
        return response;
      }

      // If user doesn't have valid subscription (new user)
      if (!hasValidSubscription) {
        // Allow access to onboarding pages
        if (isOnboardingPage) {
          logPerformanceMetrics();
          return response;
        }
        // Redirect to onboarding for all other protected routes
        logPerformanceMetrics();
        return NextResponse.redirect(
          new URL('/onboarding/profile', request.url)
        );
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
