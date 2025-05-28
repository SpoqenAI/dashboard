/**
 * Centralized logging utility with environment-aware logging and PII protection
 * 
 * Features:
 * - Environment-aware logging (debug/info only in development)
 * - PII masking for user privacy
 * - Integration points for production logging services (Sentry, LogRocket, etc.)
 * - Structured logging with consistent formatting
 */

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
   * Sanitize sensitive data from objects
   */
  sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sanitized = { ...data };
    
    // Common sensitive fields to mask
    const sensitiveFields = ['email', 'password', 'token', 'secret', 'key'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        if (field === 'email') {
          sanitized[field] = this.maskEmail(sanitized[field]);
        } else {
          sanitized[field] = '***';
        }
      }
    }

    return sanitized;
  }

  /**
   * Format log message with timestamp and level
   */
  private formatMessage(level: LogLevel, component: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] [${component}] ${message}`;
  }

  /**
   * Send logs to external service in production
   */
  private sendToExternalService(level: LogLevel, message: string, context?: LogContext, error?: Error) {
    if (!this.isProduction) return;

    // TODO: Integrate with your preferred logging service
    // Examples:
    
    // Sentry integration
    // if (typeof window !== 'undefined' && window.Sentry) {
    //   if (level === 'error' && error) {
    //     window.Sentry.captureException(error, { extra: context });
    //   } else {
    //     window.Sentry.addBreadcrumb({
    //       message,
    //       level: level as any,
    //       data: context,
    //     });
    //   }
    // }

    // LogRocket integration
    // if (typeof window !== 'undefined' && window.LogRocket) {
    //   window.LogRocket.log(level, message, context);
    // }

    // Custom API endpoint
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
      console.debug(formattedMessage, context ? this.sanitizeData(context) : '');
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
    this.sendToExternalService('info', message, context);
  }

  /**
   * Warning level logging
   */
  warn(component: string, message: string, context?: LogContext) {
    const formattedMessage = this.formatMessage('warn', component, message);
    console.warn(formattedMessage, context ? this.sanitizeData(context) : '');
    this.sendToExternalService('warn', message, context);
  }

  /**
   * Error level logging (always logged)
   */
  error(component: string, message: string, error?: Error, context?: LogContext) {
    const formattedMessage = this.formatMessage('error', component, message);
    console.error(formattedMessage, error, context ? this.sanitizeData(context) : '');
    this.sendToExternalService('error', message, context, error);
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
    }
  };
}

// Export singleton instance
export const logger = new Logger();

// Export types for external use
export type { LogLevel, LogContext }; 