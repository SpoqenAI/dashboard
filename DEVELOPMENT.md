# Development Guide - Spoqen Dashboard

## Email Verification Issues in Development

### Problem: PKCE Verification Failures

If you encounter errors like `code challenge does not match previously saved code verifier` when clicking email verification links, this is due to port mismatches between signup and verification.

**Root Cause:**
- Next.js dev server automatically switches ports if 3000 is busy
- Email verification links are generated with the port from signup time
- PKCE (Proof Key for Code Exchange) verification fails when ports don't match

### Solution

1. **Set a fixed development port** in your `.env.local`:
   ```bash
   NEXT_PUBLIC_DEV_PORT=3000
   ```

2. **Always use the same port** for development:
   ```bash
   npm run dev -- -p 3000
   ```

3. **Clear browser storage** if you've been switching ports:
   - Open DevTools → Application → Storage → Clear site data
   - Or use incognito mode for testing

### Quick Setup

Run the development setup script:
```bash
./scripts/dev-setup.sh
```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `code challenge does not match` | Port mismatch | Use consistent port, clear storage |
| `Authentication failed` | Generic PKCE issue | Check port configuration |
| `The verification link has expired` | Link older than 1 hour | Request new verification email |

### Testing Email Verification

1. **Signup** on `http://localhost:3000`
2. **Check email** for verification link
3. **Click link** - should redirect to `http://localhost:3000`
4. **Verify** successful login

### Environment Variables

Required in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_DEV_PORT=3000
```

### Troubleshooting

1. **Check console logs** for detailed error messages
2. **Verify Supabase configuration** in dashboard
3. **Test with incognito mode** to avoid cached issues
4. **Check email redirect URLs** in Supabase Auth settings

## User Dropdown Menu (SPO-128)

### Fixed Issues
- ✅ Profile menu item now navigates to `/settings?tab=profile`
- ✅ Billing menu item now navigates to `/settings?tab=billing`  
- ✅ Settings menu item now navigates to `/settings`
- ✅ Log out menu item now calls `signOut()` and redirects to `/login`
- ✅ Added proper error handling and toast notifications
- ✅ Settings page supports URL tab parameters

### Implementation Details
- Converted settings page to client component with Suspense boundary
- Added `useRouter` for navigation
- Added `useSearchParams` for tab handling
- Implemented proper error handling for sign out failures 