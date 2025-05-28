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

## Email Update and Verification Flow

### How Email Updates Work

When a user updates their email address in the profile page, the following process occurs:

1. **Email Change Detection**: The system detects when the email field has changed
2. **Supabase Auth Update**: Calls `supabase.auth.updateUser({ email: newEmail })`
3. **Verification Emails Sent**: Supabase sends verification emails to both:
   - Current email address (to confirm the change)
   - New email address (to verify ownership)
4. **Profile Update**: Other profile fields are updated immediately, but email remains unchanged
5. **User Notification**: User sees a message to check both email addresses
6. **Email Verification**: User clicks verification links in both emails
7. **Auth Callback**: Supabase redirects to `/auth/callback?type=email_change`
8. **Profile Sync**: The auth callback updates the profile table with the new verified email
9. **Success Message**: User is redirected to profile page with success message

### Configuration

The email verification behavior is controlled by the Supabase configuration:

```toml
[auth.email]
# If enabled, a user will be required to confirm any email change on both the old, and new email
# addresses. If disabled, only the new email is required to confirm.
double_confirm_changes = true
```

### Error Handling

The system handles various email update errors:

- **Email already in use**: Supabase prevents duplicate emails
- **Invalid email format**: Client-side validation catches format issues
- **Rate limiting**: Supabase limits how often verification emails can be sent
- **Verification timeout**: Email verification links expire after 1 hour

### Testing Email Updates

1. **Update email** in profile page
2. **Check both email inboxes** for verification emails
3. **Click verification links** in both emails (order doesn't matter)
4. **Verify redirect** to profile page with success message
5. **Confirm email updated** in profile data

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