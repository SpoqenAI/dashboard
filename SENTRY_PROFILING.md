# Sentry Profiling Setup

This project has been configured with Sentry profiling to help identify performance bottlenecks and optimize slow code paths.

## Configuration

### Server-Side Profiling (Node.js)

- **File**: `sentry.server.config.ts`
- **Integration**: `nodeProfilingIntegration()` from `@sentry/profiling-node`
- **Settings**:
  - `tracesSampleRate: 0.1` - Captures 10% of transactions
  - `profileSessionSampleRate: 0.1` - Profiles 10% of sessions
  - `profileLifecycle: 'trace'` - Automatically enables profiling during active traces

### Client-Side Profiling (Browser)

- **File**: `sentry.client.config.ts`
- **Settings**:
  - `tracesSampleRate: 0.1` - Captures 10% of transactions
  - `profileSessionSampleRate: 0.1` - Profiles 10% of sessions
  - `profileLifecycle: 'trace'` - Automatically enables profiling during active traces

## Usage

### Automatic Profiling

Profiling happens automatically after setting it up with `Sentry.init()`. All spans (unless discarded by sampling) will have profiling data attached to them.

### Manual Profiling with Spans

Use the utility functions in `lib/sentry-profiling.ts` to profile specific code paths:

```typescript
import {
  profileFunction,
  profileDatabaseOperation,
  profileApiCall,
} from '@/lib/sentry-profiling';

// Profile a database query
const users = await profileDatabaseOperation('query', 'users', async () => {
  return await supabase.from('users').select('*');
});

// Profile an API call
const data = await profileApiCall('GET', '/api/users', async () => {
  return await fetch('/api/users').then(res => res.json());
});

// Profile a complex function
const result = await profileFunction('processUserData', async () => {
  // Your complex processing logic here
  return processedData;
});
```

### Direct Span Usage

You can also use Sentry spans directly:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.startSpan(
  {
    name: 'My Span',
  },
  () => {
    // The code executed here will be profiled
    // Your code here
  }
);
```

## What You'll See in Sentry

1. **Performance Dashboard**: View aggregated profiling data to find the slowest code paths
2. **Function-Level Visibility**: See which specific functions are causing increased latency
3. **Resource Usage**: Identify functions that cause excessive infrastructure costs
4. **Mobile/Browser Performance**: Debug unresponsive interactions and janky scrolling

## Environment Variables

Make sure you have the following environment variables set:

```env
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
```

## Production Considerations

The current configuration is optimized for production with 10% sampling rates:

```typescript
tracesSampleRate: 0.1, // Capture 10% of transactions
profileSessionSampleRate: 0.1, // Profile 10% of sessions
```

This provides a good balance between performance insights and overhead. You can adjust these rates based on your needs:

- **Higher rates (0.5-1.0)**: More detailed profiling, higher overhead
- **Lower rates (0.01-0.05)**: Less overhead, fewer insights

## Troubleshooting

1. **Profiling not showing up**: Ensure `tracesSampleRate` is greater than 0
2. **High overhead**: Reduce sampling rates in production
3. **Missing spans**: Check that your code is wrapped in `Sentry.startSpan()`

## Resources

- [Sentry Node.js Profiling Documentation](https://docs.sentry.io/platforms/node/profiling/)
- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)
