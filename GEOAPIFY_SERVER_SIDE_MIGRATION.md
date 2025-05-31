# Geoapify Server-Side Migration Guide

This guide explains how to migrate from client-side Geoapify API usage to a more secure server-side implementation.

## What Changed

### Security Improvements ✅

- **API Key Protection**: Geoapify API key is now server-side only
- **Rate Limiting Control**: Better control over API usage
- **Domain Restrictions**: Not needed anymore (server-to-server calls)
- **Centralized Error Handling**: Better error management and logging

### Files Created/Modified

- ✅ `app/api/geocode/route.ts` - New server-side API endpoint
- ✅ `components/AddressAutocompleteServerSide.tsx` - New secure component
- 📝 Environment variables updated (see below)

## Environment Variables Update

### Before (Client-Side)

```bash
# Old - exposed to client
NEXT_PUBLIC_GEOAPIFY_API_KEY=6813e321640841cd88404087261dfa66
```

### After (Server-Side)

```bash
# New - server-side only (REMOVE NEXT_PUBLIC_ prefix)
GEOAPIFY_API_KEY=6813e321640841cd88404087261dfa66

# Optional: Keep the old one temporarily during migration
# NEXT_PUBLIC_GEOAPIFY_API_KEY=6813e321640841cd88404087261dfa66
```

## Step-by-Step Migration

### 1. Update Environment Variables

```bash
# In your .env.local file:
# Add the new server-side variable
GEOAPIFY_API_KEY=6813e321640841cd88404087261dfa66

# Optionally comment out the old one (for rollback safety)
# NEXT_PUBLIC_GEOAPIFY_API_KEY=6813e321640841cd88404087261dfa66
```

### 2. Update Component Usage

Replace the old component with the new secure version:

```tsx
// Before
import AddressAutocomplete from '@/components/AddressAutocomplete';

// After
import AddressAutocompleteServerSide from '@/components/AddressAutocompleteServerSide';

// Usage (same API)
<AddressAutocompleteServerSide
  onPlaceSelect={handleAddressSelect}
  onInputChange={handleInputChange}
  onError={handleError}
  placeholder="Enter your business address..."
  value={addressValue}
  className="my-custom-class"
/>;
```

### 3. Update Production Environment

**In Vercel/Production:**

1. Go to your Vercel dashboard
2. Navigate to Environment Variables
3. Add: `GEOAPIFY_API_KEY` with your API key value
4. Remove: `NEXT_PUBLIC_GEOAPIFY_API_KEY` (after testing)

**In other deployment platforms:**

- Set `GEOAPIFY_API_KEY` as a server-side environment variable
- Remove `NEXT_PUBLIC_GEOAPIFY_API_KEY`

## API Endpoint Usage

The new server-side API provides two endpoints:

### GET /api/geocode

Basic geocoding search:

```bash
GET /api/geocode?text=New York&limit=5
```

### POST /api/geocode

Advanced geocoding with filters:

```bash
POST /api/geocode
Content-Type: application/json

{
  "text": "New York",
  "filters": {
    "limit": 5,
    "type": "locality",
    "countrycode": "us"
  }
}
```

## Testing the Migration

### 1. Test Server-Side API

```bash
# Test the API endpoint directly
curl "http://localhost:3000/api/geocode?text=New%20York&limit=3"
```

### 2. Test Component Integration

- Use the new `AddressAutocompleteServerSide` component
- Verify autocomplete suggestions appear
- Check that address selection works
- Confirm error handling is working

### 3. Test Production Deployment

- Deploy with new environment variables
- Verify API key is not exposed in client bundle
- Check Network tab in browser - should see calls to `/api/geocode`

## Rollback Plan

If issues arise, you can quickly rollback:

1. **Keep old component**: Don't delete `AddressAutocomplete.tsx` immediately
2. **Keep old env var**: Keep `NEXT_PUBLIC_GEOAPIFY_API_KEY` during transition
3. **Switch back**: Change import back to old component if needed

```tsx
// Rollback: switch back to old component
import AddressAutocomplete from '@/components/AddressAutocomplete';
```

## Benefits After Migration

### Security ✅

- ✅ API key not exposed in client bundle
- ✅ No domain restrictions needed
- ✅ Server-side rate limiting control
- ✅ Better error handling and logging

### Performance ✅

- ✅ Same user experience
- ✅ Proper request cancellation
- ✅ Debounced search requests
- ✅ Better error feedback

### Maintainability ✅

- ✅ Centralized API management
- ✅ Consistent error handling
- ✅ Better monitoring capabilities
- ✅ Easier to add caching later

## Monitoring & Debugging

### Check Logs

```bash
# In development, check console for:
[DEBUG] [AddressAutocomplete] Search completed successfully
[ERROR] [Geocode API] Geoapify API error

# In production, check Sentry for geocoding errors
```

### Verify Security

1. Open browser DevTools → Network tab
2. Search for an address
3. Should see requests to `/api/geocode` (not `api.geoapify.com`)
4. Check Sources tab - no Geoapify API key visible

## Next Steps (Optional)

### Add Caching (Future Enhancement)

```typescript
// In /api/geocode/route.ts - add Redis/memory caching
const cached = await redis.get(`geocode:${text}`);
if (cached) return NextResponse.json(JSON.parse(cached));
```

### Add Rate Limiting (Future Enhancement)

```typescript
// Add rate limiting per IP
const rateLimiter = new RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
```

### Add Analytics (Future Enhancement)

```typescript
// Track geocoding usage
analytics.track('geocode_request', {
  searchLength: text.length,
  resultCount: data.features.length,
});
```

---

## Cleanup After Successful Migration

After confirming everything works in production:

1. **Remove old environment variable**:

   ```bash
   # Remove from .env.local and production
   # NEXT_PUBLIC_GEOAPIFY_API_KEY=...
   ```

2. **Remove old component** (optional):

   ```bash
   # After a few successful deployments
   rm components/AddressAutocomplete.tsx
   ```

3. **Update dependencies** (optional):
   ```bash
   # Remove Geoapify packages if no longer needed
   npm uninstall @geoapify/geocoder-autocomplete @geoapify/react-geocoder-autocomplete
   ```
