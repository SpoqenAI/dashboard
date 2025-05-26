# Development Testing Guide

## 🧪 Testing OAuth & Password Reset on Localhost

### Prerequisites

1. **Supabase Configuration**: Ensure these redirect URLs are added in your Supabase Dashboard (Authentication → URL Configuration):

   ```
   http://localhost:3000/auth/callback
   http://localhost:3000/reset-password
   https://spoqen-dashboard.vercel.app/auth/callback
   https://spoqen-dashboard.vercel.app/reset-password
   ```

2. **Environment Variables**: Your `.env.local` should contain:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   # Leave NEXT_PUBLIC_SITE_URL empty for localhost testing
   ```

### 🔄 Testing Password Reset Flow on Localhost

#### Method 1: Force Localhost Redirect (Recommended for Testing)

1. **Temporarily override the redirect URL in `lib/auth.ts`**:

   ```typescript
   export async function resetPassword(email: string) {
     const supabase = getSupabaseClient();

     // Force localhost for testing
     const redirectUrl = 'http://localhost:3000/reset-password';

     const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
       redirectTo: redirectUrl,
     });

     return { data, error };
   }
   ```

2. **Test the flow**:
   - Go to `http://localhost:3000/forgot-password`
   - Enter your email and submit
   - Check your email for the reset link
   - Click the link → should redirect to `localhost:3000/reset-password`

#### Method 2: Modify Email Link Manually

1. Use the production password reset flow
2. When you receive the email, manually change the redirect URL:

   **Original email link**:

   ```
   https://vjsmwwuozuiwjprldpjx.supabase.co/auth/v1/verify?token=...&type=recovery&redirect_to=https://spoqen-dashboard.vercel.app
   ```

   **Modified for localhost testing**:

   ```
   https://vjsmwwuozuiwjprldpjx.supabase.co/auth/v1/verify?token=...&type=recovery&redirect_to=http://localhost:3000
   ```

3. Click the modified link to test localhost flow

### 🚀 Production Deployment & Testing

Once your branch is merged and deployed to production:

1. **Verify production deployment** at `https://spoqen-dashboard.vercel.app`
2. **Test production password reset**:
   - Go to `/forgot-password`
   - Submit email
   - Email link should work with production URL
3. **Test OAuth flows** with production URL

### 🔧 Environment-Specific Behavior

The `getSiteUrl()` function automatically determines the correct URL:

- **Development**: `http://localhost:3000` (when no NEXT_PUBLIC_SITE_URL is set)
- **Production**: `https://spoqen-dashboard.vercel.app` (when NEXT_PUBLIC_SITE_URL is set)
- **Preview**: Uses Vercel preview URL automatically

### 🐛 Troubleshooting

1. **Email links not working on localhost**:

   - Verify Supabase redirect URLs include `http://localhost:3000`
   - Check that NEXT_PUBLIC_SITE_URL is not set in development

2. **Production links not working**:

   - Ensure latest code is deployed
   - Verify NEXT_PUBLIC_SITE_URL is set to production URL
   - Check Supabase redirect URLs include production URL

3. **OAuth errors**:
   - Check browser console for detailed error messages
   - Verify OAuth provider configuration in Supabase
   - Ensure redirect URLs match exactly (no trailing slashes)

### 📋 Testing Checklist

#### Localhost Testing

- [ ] Start development server (`npm run dev`)
- [ ] Test forgot password flow
- [ ] Test password reset completion
- [ ] Test OAuth sign-in (Google)
- [ ] Verify error handling

#### Production Testing

- [ ] Deploy branch to production
- [ ] Test forgot password flow on production
- [ ] Test OAuth flows on production
- [ ] Verify new user onboarding
- [ ] Test existing user login

## 🔄 Quick Test Commands

```bash
# Start development server
npm run dev

# Test callback route directly
curl -X GET "http://localhost:3000/auth/callback?error=access_denied"

# Check environment variables
echo $NEXT_PUBLIC_SITE_URL
```
