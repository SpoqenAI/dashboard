// Rate limiter utility for API endpoints
// Follows the same pattern as call-cache.ts for consistency

interface RateLimitEntry {
  count: number;
  windowStart: number;
  lastRequest: number;
}

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyPrefix: string; // Prefix for cache keys
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

class RateLimiter {
  private cache = new Map<string, RateLimitEntry>();
  private lastCleanup = Date.now();
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor(private config: RateLimitConfig) {}

  check(identifier: string): RateLimitResult {
    // Cleanup expired entries periodically
    this.maybeCleanup();

    const key = `${this.config.keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    let entry = this.cache.get(key);

    // Initialize or reset window if expired
    if (!entry || entry.windowStart < windowStart) {
      entry = {
        count: 0,
        windowStart: now,
        lastRequest: now,
      };
    }

    // Check if limit exceeded
    if (entry.count >= this.config.maxRequests) {
      const resetTime = entry.windowStart + this.config.windowMs;
      const retryAfter = Math.ceil((resetTime - now) / 1000);

      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter: retryAfter > 0 ? retryAfter : 1,
      };
    }

    // Increment counter and update cache
    entry.count++;
    entry.lastRequest = now;
    this.cache.set(key, entry);

    const resetTime = entry.windowStart + this.config.windowMs;
    const remaining = this.config.maxRequests - entry.count;

    return {
      allowed: true,
      remaining,
      resetTime,
    };
  }

  // Get current usage for an identifier (useful for debugging)
  getUsage(
    identifier: string
  ): { count: number; remaining: number; resetTime: number } | null {
    const key = `${this.config.keyPrefix}:${identifier}`;
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Check if window expired
    if (entry.windowStart < windowStart) {
      return null;
    }

    const resetTime = entry.windowStart + this.config.windowMs;
    const remaining = this.config.maxRequests - entry.count;

    return {
      count: entry.count,
      remaining,
      resetTime,
    };
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.config.windowMs;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.windowStart < cutoff) {
        this.cache.delete(key);
      }
    }
  }

  // Lazy cleanup - only runs when rate limiter is accessed
  private maybeCleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup > this.CLEANUP_INTERVAL) {
      this.cleanup();
      this.lastCleanup = now;
    }
  }

  // Get cache stats for monitoring
  getStats(): { totalEntries: number; lastCleanup: number } {
    return {
      totalEntries: this.cache.size,
      lastCleanup: this.lastCleanup,
    };
  }

  // Clear all entries (useful for testing)
  clear(): void {
    this.cache.clear();
  }
}

// Pre-configured rate limiters for different use cases
export const faqFeedbackRateLimiter = {
  // IP-based rate limiting: 5 requests per 5 minutes
  ip: new RateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 5,
    keyPrefix: 'faq_feedback_ip',
  }),

  // Session-based rate limiting: 10 requests per 5 minutes
  session: new RateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10,
    keyPrefix: 'faq_feedback_session',
  }),
};

// Generic rate limiter factory for other endpoints
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  return new RateLimiter(config);
}

// Helper function to check multiple rate limiters
export function checkMultipleRateLimits(
  checks: Array<{ limiter: RateLimiter; identifier: string; name: string }>
): {
  allowed: boolean;
  failedCheck?: string;
  retryAfter?: number;
  results: Record<string, RateLimitResult>;
} {
  const results: Record<string, RateLimitResult> = {};

  for (const check of checks) {
    const result = check.limiter.check(check.identifier);
    results[check.name] = result;

    if (!result.allowed) {
      return {
        allowed: false,
        failedCheck: check.name,
        retryAfter: result.retryAfter,
        results,
      };
    }
  }

  return {
    allowed: true,
    results,
  };
}
