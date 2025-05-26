# TODO: Remove Development Override

## After production deployment is complete:

1. **Remove the development override** in `lib/auth.ts`:

```typescript
// Remove this section:
const redirectUrl =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000/reset-password'
    : `${siteUrl}/reset-password`;

// Replace with original:
const redirectUrl = `${siteUrl}/reset-password`;
```

2. **Commit and deploy** the cleanup:

```bash
git add lib/auth.ts
git commit -m "cleanup: remove development override for resetPassword"
git push
```

## Why this is needed:

The temporary override forces localhost redirects during development testing, but production should use the proper environment-based URL from `getSiteUrl()`.

## File to modify:

- `lib/auth.ts` (lines 47-50)
