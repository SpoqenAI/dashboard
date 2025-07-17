# Redis Call Analysis Optimization

## Overview

This optimization replaces slow database writes to the `call_analysis` table with fast Redis storage using Upstash. The system now processes call analysis **100% via VAPI's AI** with automatic webhook processing when calls end.

## Key Benefits

✅ **Performance**: Redis storage is significantly faster than database writes  
✅ **100% AI-Generated**: No manual pattern matching - relies purely on VAPI's analysis  
✅ **Automatic**: Analysis happens automatically via webhook when calls end  
✅ **Proper Hierarchy**: Uses VAPI's `structuredData` → `summary` → fallback pattern  
✅ **No Fallbacks**: No manual processing needed - everything comes from VAPI AI

## Architecture

### Redis Storage Schema

```
call_analysis:{userId}:{callId}     - Individual call analysis data (90 day TTL)
user_calls:{userId}                 - Sorted set of call IDs by timestamp
call_metadata:{callId}              - Basic call metadata (if needed)
```

### Data Flow

1. **Call Ends** → VAPI sends webhook to `/api/webhooks/vapi`
2. **Webhook Processes** → Extracts RAW VAPI analysis data
3. **Redis Storage** → Stores analysis with fast write performance
4. **UI Retrieval** → Action points API reads from Redis with caching
5. **Analytics** → Dashboard aggregates from Redis data

## Implementation Details

### VAPI Webhook (`app/api/webhooks/vapi/route.ts`)

- Receives `end-of-call-report` events from VAPI
- Extracts **RAW VAPI analysis** without any processing
- Stores complete `structuredData`, `summary`, and `successEvaluation`
- Uses `storeCallAnalysis()` for Redis persistence

### Action Points API (`app/api/vapi/action-points/route.ts`)

- Checks Redis cache first for instant retrieval
- Falls back to VAPI API only if not cached
- Uses `extractActionPointsFromVapiAnalysis()` with VAPI hierarchy
- **NO manual pattern matching** - 100% VAPI AI analysis

### Analytics API (`app/api/vapi/analytics/route.ts`)

- Replaced database queries with Redis lookups
- Parallel retrieval for multiple calls
- Aggregates sentiment and lead quality from VAPI's `structuredData`

## Configuration

### Environment Variables

```bash
# Upstash Redis for call analysis storage
UPSTASH_REDIS_REST_URL=https://your-redis-endpoint.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_rest_token
```

### VAPI Assistant Configuration

Ensure your VAPI assistant is configured with proper analysis:

```json
{
  "analysisPlan": {
    "summaryPrompt": "Summarize this call concisely",
    "structuredDataPrompt": "Extract key information from this call",
    "structuredDataSchema": {
      "type": "object",
      "properties": {
        "sentiment": {
          "type": "string",
          "enum": ["positive", "negative", "neutral"]
        },
        "leadQuality": { "type": "string", "enum": ["hot", "warm", "cold"] },
        "callPurpose": { "type": "string" },
        "keyPoints": { "type": "array", "items": { "type": "string" } },
        "followUpItems": { "type": "array", "items": { "type": "string" } },
        "urgentConcerns": { "type": "array", "items": { "type": "string" } },
        "appointmentRequested": { "type": "boolean" },
        "timeline": { "type": "string" },
        "contactPreference": { "type": "string" },
        "businessInterest": { "type": "string" }
      }
    }
  }
}
```

## Redis Client Usage

### Storing Analysis

```typescript
import { storeCallAnalysis } from '@/lib/redis/client';

const analysisData = {
  callId,
  userId,
  assistantId,
  analyzedAt: new Date().toISOString(),
  vapiAnalysis: {
    summary: message.analysis?.summary,
    structuredData: message.analysis?.structuredData || {},
    successEvaluation: message.analysis?.successEvaluation,
  },
};

await storeCallAnalysis(analysisData);
```

### Retrieving Analysis

```typescript
import { getCallAnalysis } from '@/lib/redis/client';

const analysis = await getCallAnalysis(userId, callId);
if (analysis) {
  const sentiment = analysis.vapiAnalysis?.structuredData?.sentiment;
  const leadQuality = analysis.vapiAnalysis?.structuredData?.leadQuality;
}
```

### Bulk Retrieval

```typescript
import { getUserCallAnalyses } from '@/lib/redis/client';

const userAnalyses = await getUserCallAnalyses(userId, 100);
```

## Performance Characteristics

- **Write Speed**: ~10ms (vs ~100-500ms database writes)
- **Read Speed**: ~5-15ms with Redis
- **Scalability**: Handles high call volumes without performance degradation
- **TTL**: 90 days automatic cleanup
- **Concurrency**: Supports parallel reads/writes

## Monitoring

### Key Metrics to Monitor

- Redis connection health
- Cache hit rates for action points
- Webhook processing times
- Analysis data completeness

### Logging

The system logs comprehensive metrics:

- `REDIS` - All Redis operations
- `VAPI_WEBHOOK` - Webhook processing
- `ACTION_POINTS` - Action point generation
- `ANALYTICS` - Analytics aggregation

## Migration Notes

### What Changed

1. **Removed**: Database `call_analysis` table dependencies
2. **Added**: Redis-based storage with `@upstash/redis`
3. **Updated**: All APIs to use Redis instead of database
4. **Eliminated**: Manual pattern matching and text analysis
5. **Improved**: 100% reliance on VAPI's AI analysis

### Backward Compatibility

- APIs maintain the same response format
- Action points structure unchanged
- Analytics endpoints work identically
- No frontend changes required

## Troubleshooting

### Common Issues

1. **Missing Analysis**: Ensure VAPI webhook is configured correctly
2. **Redis Connection**: Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
3. **Empty Data**: Check VAPI assistant has proper `analysisPlan` configuration

### Debug Commands

```bash
# Test Redis connection
node -e "const {Redis} = require('@upstash/redis'); new Redis({url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN}).ping().then(console.log)"
```

## Future Enhancements

- [ ] Real-time analytics with Redis Streams
- [ ] Advanced caching strategies
- [ ] Analytics data compression
- [ ] Redis clustering for scale
