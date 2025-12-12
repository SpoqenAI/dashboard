import * as Sentry from '@sentry/nextjs';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogContext = Record<string, unknown>;

const isTestEnv = process.env.NODE_ENV === 'test';
const noop = () => undefined;

const consoleByLevel: Record<LogLevel, (...args: unknown[]) => void> = {
  debug: console.debug ?? console.log,
  info: console.info ?? console.log,
  warn: console.warn ?? console.log,
  error: console.error ?? console.log,
};

const toError = (error?: unknown): Error | undefined => {
  if (!error) return undefined;
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error);
  try {
    return new Error(JSON.stringify(error));
  } catch {
    return new Error('Unknown error object');
  }
};

const baseLog = (
  level: LogLevel,
  event: string,
  message: string,
  error?: unknown,
  context?: LogContext
) => {
  const normalizedError = toError(error);
  const payload = context ?? {};

  if (!isTestEnv) {
    const loggerFn = consoleByLevel[level] ?? noop;
    if (normalizedError) {
      loggerFn(`[${event}] ${message}`, payload, normalizedError);
    } else {
      loggerFn(`[${event}] ${message}`, payload);
    }
  }

  // Keep breadcrumbs for non-error logs, capture exceptions for errors
  try {
    if (level === 'error' && normalizedError) {
      Sentry.captureException(normalizedError, {
        tags: { event, level },
        extra: { ...payload, message },
      });
    } else {
      const breadcrumbLevel = level === 'warn' ? 'warning' : level;
      Sentry.addBreadcrumb({
        level: breadcrumbLevel,
        category: event,
        message,
        data: payload,
      });
    }
  } catch {
    // Avoid crashing the app if Sentry is not configured
  }
};

const maskValue = (value?: string | null, visibleStart = 2, visibleEnd = 2) => {
  if (!value) return '***';
  if (value.length <= visibleStart + visibleEnd) return `${value[0]}***`;
  return `${value.slice(0, visibleStart)}***${value.slice(-visibleEnd)}`;
};

const maskEmail = (email?: string | null) => {
  if (!email) return '***@***';
  const [local = '', domain = '***'] = email.split('@');
  return `${maskValue(local, 1, 1)}@${domain}`;
};

const maskUserId = (userId?: string | null) => maskValue(userId, 3, 3);

const fmt = (strings: TemplateStringsArray, ...values: unknown[]) => {
  const message = strings.reduce(
    (acc, part, idx) => `${acc}${part}${idx < values.length ? values[idx] : ''}`,
    ''
  );

  const levelMatch = message.match(/level=([a-z]+)/i);
  const eventMatch = message.match(/event=([A-Z0-9_]+)/i);
  const level =
    (levelMatch?.[1]?.toLowerCase() as LogLevel | undefined) ?? 'info';
  const event = eventMatch?.[1] ?? 'APP_LOG';

  baseLog(level, event, message);
  return message;
};

export const logger = {
  debug: (event: string, message: string, context?: LogContext) =>
    baseLog('debug', event, message, undefined, context),
  info: (event: string, message: string, context?: LogContext) =>
    baseLog('info', event, message, undefined, context),
  warn: (event: string, message: string, context?: LogContext) =>
    baseLog('warn', event, message, undefined, context),
  error: (
    event: string,
    message: string,
    error?: unknown,
    context?: LogContext
  ) => baseLog('error', event, message, error, context),
  maskEmail,
  maskUserId,
  fmt,
};

export type Logger = typeof logger;

