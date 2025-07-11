/**
 * Centralized logging utility with environment-aware logging and PII protection
 *
 * Features:
 * - Environment-aware logging (debug/info only in development)
 * - PII masking for user privacy
 * - Integration points for production logging services (Sentry, LogRocket, etc.)
 * - Structured logging with consistent formatting
 */

// Lazy-loaded Sentry reference (browser bundle weight optimisation)
let sentryInstance: typeof import('@sentry/nextjs') | null = null;

async function getSentry() {
  if (sentryInstance) return sentryInstance;
  try {
    sentryInstance = await import('@sentry/nextjs');
  } catch (e) {
    // Sentry failed to load (e.g. network issues or package missing). Ignore.
    sentryInstance = null;
  }
  return sentryInstance;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production';
  private isProduction = process.env.NODE_ENV === 'production';

  /**
   * Mask email addresses for privacy protection
   */
  maskEmail(email: string | undefined | null): string {
    if (!email) return 'no-email';
    const [localPart, domain] = email.split('@');
    if (!domain) return '***@unknown';
    return `${localPart.slice(0, 2)}***@${domain}`;
  }

  /**
   * Mask user ID for privacy protection
   */
  maskUserId(userId: string | undefined | null): string {
    if (!userId) return 'no-id';
    return `${userId.slice(0, 8)}...`;
  }

  /**
   * Sanitize sensitive data from objects recursively
   */
  sanitizeData(data: any): any {
    if (!data) return data;

    // Handle primitive types
    if (typeof data !== 'object') return data;

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    // Handle objects
    const sanitized: any = {};

    // Common sensitive fields to mask
    const sensitiveFields = ['email', 'password', 'token', 'secret', 'key'];

    for (const [key, value] of Object.entries(data)) {
      // Check if current key is sensitive
      const isSensitiveField = sensitiveFields.some(field =>
        key.toLowerCase().includes(field.toLowerCase())
      );

      if (isSensitiveField) {
        // Apply appropriate masking based on field type
        if (key.toLowerCase().includes('email')) {
          sanitized[key] = this.maskEmail(value as string);
        } else {
          sanitized[key] = '***';
        }
      } else {
        // Recursively sanitize nested objects/arrays
        sanitized[key] = this.sanitizeData(value);
      }
    }

    return sanitized;
  }

  /**
   * Format log message with timestamp and level
   */
  private formatMessage(
    level: LogLevel,
    component: string,
    message: string
  ): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] [${component}] ${message}`;
  }

  /**
   * Send logs to external service in production
   */
  private async sendToExternalService(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ) {
    if (!this.isProduction) return;

    // Sentry integration - now active!
    try {
      const Sentry = await getSentry();
      if (Sentry && level === 'error' && error) {
        Sentry.captureException(error, {
          extra: context,
          tags: { component: 'logger' },
        });
      } else if (Sentry) {
        Sentry.addBreadcrumb({
          message,
          level: level as any,
          data: context,
          category: 'logger',
        });
      }
    } catch (sentryError) {
      // Fail silently if Sentry has issues
      console.warn('Failed to send to Sentry:', sentryError);
    }

    // LogRocket integration (commented out - uncomment if you add LogRocket)
    // if (typeof window !== 'undefined' && window.LogRocket) {
    //   window.LogRocket.log(level, message, context);
    // }

    // Custom API endpoint (commented out - uncomment if you want custom logging)
    // fetch('/api/logs', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ level, message, context, timestamp: new Date().toISOString() })
    // }).catch(() => {}); // Fail silently
  }

  /**
   * Debug level logging (development only)
   */
  debug(component: string, message: string, context?: LogContext) {
    if (this.isDevelopment) {
      const formattedMessage = this.formatMessage('debug', component, message);
      console.debug(
        formattedMessage,
        context ? this.sanitizeData(context) : ''
      );
    }
  }

  /**
   * Info level logging (development only)
   */
  info(component: string, message: string, context?: LogContext) {
    if (this.isDevelopment) {
      const formattedMessage = this.formatMessage('info', component, message);
      console.info(formattedMessage, context ? this.sanitizeData(context) : '');
    }
    this.sendToExternalService(
      'info',
      message,
      context ? this.sanitizeData(context) : undefined
    );
  }

  /**
   * Warning level logging
   */
  warn(component: string, message: string, context?: LogContext) {
    const formattedMessage = this.formatMessage('warn', component, message);
    console.warn(formattedMessage, context ? this.sanitizeData(context) : '');
    this.sendToExternalService(
      'warn',
      message,
      context ? this.sanitizeData(context) : undefined
    );
  }

  /**
   * Error level logging (always logged)
   */
  error(
    component: string,
    message: string,
    error?: Error,
    context?: LogContext
  ) {
    const formattedMessage = this.formatMessage('error', component, message);
    console.error(
      formattedMessage,
      error,
      context ? this.sanitizeData(context) : ''
    );
    this.sendToExternalService(
      'error',
      message,
      context ? this.sanitizeData(context) : undefined,
      error
    );
  }

  /**
   * Authentication-specific logging with automatic PII masking
   */
  auth = {
    debug: (message: string, context?: LogContext) => {
      this.debug('AUTH', message, context);
    },

    info: (message: string, context?: LogContext) => {
      this.info('AUTH', message, context);
    },

    warn: (message: string, context?: LogContext) => {
      this.warn('AUTH', message, context);
    },

    error: (message: string, error?: Error, context?: LogContext) => {
      this.error('AUTH', message, error, context);
    },

    /**
     * Log authentication events with automatic PII masking
     */
    event: (event: string, session: any) => {
      if (this.isDevelopment) {
        const maskedContext = {
          event,
          userEmail: this.maskEmail(session?.user?.email),
          userId: this.maskUserId(session?.user?.id),
          hasSession: !!session,
        };
        this.info('AUTH', `Auth event: ${event}`, maskedContext);
      }
      this.sendToExternalService('info', `Auth event: ${event}`, {
        event,
        hasSession: !!session,
        // Don't send PII to external services
      });
    },
  };
}

// Export singleton instance
export const logger = new Logger();

// Export types for external use
export type { LogLevel, LogContext };
