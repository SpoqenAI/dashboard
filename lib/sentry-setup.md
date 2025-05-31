# Quick Sentry Setup Guide (Free Tier)

## 1. Create Sentry Account

1. Go to [sentry.io](https://sentry.io) and sign up for free
2. Create a new project and select "Next.js"
3. Copy your DSN (Data Source Name)

## 2. Install Sentry

```bash
npm install @sentry/nextjs
```

## 3. Configure Environment Variables

Add to your `.env.local`:

```env
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn-here@sentry.io/project-id
SENTRY_ORG=your-org-name
SENTRY_PROJECT=your-project-name
```

## 4. Initialize Sentry

Create `sentry.client.config.ts` in your project root:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  debug: false,
});
```

Create `sentry.server.config.ts` in your project root:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  debug: false,
});
```

## 5. Enable in Logger

The Sentry integration is already active in `lib/logger.ts` with this implementation:

```typescript
// Sentry integration - now active!
try {
  if (level === 'error' && error) {
    Sentry.captureException(error, {
      extra: context,
      tags: { component: 'logger' },
    });
  } else {
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
```

## 6. Test It

Your authentication errors and events will now be automatically sent to Sentry in production!

## Free Tier Limits

- ✅ 5,000 errors/month
- ✅ 10,000 performance transactions/month
- ✅ 1 team member
- ✅ 30-day error retention
- ✅ Basic integrations

Perfect for most small to medium applications!
