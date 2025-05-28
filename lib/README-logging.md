# Secure Logging System

This project implements a comprehensive logging system that protects user privacy and provides environment-aware logging capabilities.

## Features

- **Environment-aware logging**: Debug and info logs only appear in development
- **PII Protection**: Automatic masking of sensitive data like emails and user IDs
- **Centralized logging**: Single logger instance used across the application
- **External service integration**: Ready for Sentry, LogRocket, and custom logging services
- **Structured logging**: Consistent formatting with timestamps and log levels

## Usage

```typescript
import { logger } from '@/lib/logger';

// General logging
logger.debug('COMPONENT', 'Debug message', { data: 'context' });
logger.info('COMPONENT', 'Info message', { userId: '123' });
logger.warn('COMPONENT', 'Warning message', { issue: 'details' });
logger.error('COMPONENT', 'Error message', error, { context: 'data' });

// Authentication-specific logging (automatically masks PII)
logger.auth.debug('User action performed');
logger.auth.info('Authentication flow completed');
logger.auth.event('SIGNED_IN', session); // Automatically masks email/ID
logger.auth.error('Auth failed', error);
```

## Privacy Protection

The logger automatically masks sensitive information:

- **Emails**: `user@example.com` → `us***@example.com`
- **User IDs**: `uuid-1234-5678-9012` → `uuid-123...`
- **Sensitive fields**: Automatically detects and masks `password`, `token`, `secret`, `key` fields

## Environment Behavior

### Development (`NODE_ENV !== 'production'`)

- All log levels are output to console
- Full context and debugging information available
- PII is masked but more verbose logging

### Production (`NODE_ENV === 'production'`)

- Only warnings and errors are output to console
- Debug and info logs are suppressed from console
- Logs can be sent to external services
- Maximum privacy protection

## External Service Integration

### Sentry Integration

1. Install Sentry:

```bash
npm install @sentry/nextjs
```

2. Uncomment and configure Sentry integration in `lib/logger.ts`:

```typescript
// Sentry integration
if (typeof window !== 'undefined' && window.Sentry) {
  if (level === 'error' && error) {
    window.Sentry.captureException(error, { extra: context });
  } else {
    window.Sentry.addBreadcrumb({
      message,
      level: level as any,
      data: context,
    });
  }
}
```

3. Initialize Sentry in your app:

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### LogRocket Integration

1. Install LogRocket:

```bash
npm install logrocket
```

2. Uncomment and configure LogRocket integration in `lib/logger.ts`:

```typescript
// LogRocket integration
if (typeof window !== 'undefined' && window.LogRocket) {
  window.LogRocket.log(level, message, context);
}
```

3. Initialize LogRocket:

```typescript
// app/layout.tsx
import LogRocket from 'logrocket';

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  LogRocket.init(process.env.NEXT_PUBLIC_LOGROCKET_APP_ID);
}
```

### Custom API Logging

Uncomment the custom API endpoint integration in `lib/logger.ts`:

```typescript
// Custom API endpoint
fetch('/api/logs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
  }),
}).catch(() => {}); // Fail silently
```

Create the API endpoint:

```typescript
// app/api/logs/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const logData = await request.json();

    // Send to your logging service
    // await sendToLoggingService(logData);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to log' }, { status: 500 });
  }
}
```

## Environment Variables

Add these to your `.env.local` file:

```env
# Sentry
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here

# LogRocket
NEXT_PUBLIC_LOGROCKET_APP_ID=your_logrocket_app_id_here

# Custom logging endpoint
NEXT_PUBLIC_LOGGING_ENDPOINT=https://your-logging-service.com/api/logs
```

## Best Practices

1. **Use appropriate log levels**:

   - `debug`: Detailed debugging information
   - `info`: General information about application flow
   - `warn`: Warning conditions that should be addressed
   - `error`: Error conditions that need immediate attention

2. **Provide context**: Always include relevant context data with your logs

3. **Don't log sensitive data**: The logger masks common sensitive fields, but be mindful of what you're logging

4. **Use component-specific prefixes**: Help identify where logs are coming from

5. **Handle errors gracefully**: Always catch and log errors appropriately

## Migration from Console Logs

Replace existing console logs:

```typescript
// Before
console.log('User signed in:', user.email);
console.error('Auth error:', error);

// After
logger.auth.event('SIGNED_IN', session); // Automatically masks email
logger.auth.error('Authentication failed', error);
```

## Testing

The logger respects the `NODE_ENV` environment variable. For testing:

```typescript
// In tests, you can mock the logger
jest.mock('@/lib/logger', () => ({
  logger: {
    auth: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      event: jest.fn(),
    },
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));
```
