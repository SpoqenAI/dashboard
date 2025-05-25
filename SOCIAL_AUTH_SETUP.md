# Google Authentication Setup Guide

This guide explains how to configure Google OAuth authentication in Supabase for the Spoqen Dashboard.

## Overview

The Google authentication feature has been implemented with the following components:
- Enhanced auth library with Google login function
- Reusable `SocialLogin` component with Google OAuth
- Updated login and signup pages
- Proper error handling and loading states

## Supabase Configuration

To enable Google authentication, you need to configure the Google provider in your Supabase dashboard.

### Google OAuth Setup

#### Step 1: Create Google OAuth Credentials
1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Identity API (or ensure Google Sign-In is configured)
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set application type to "Web application"
6. Add authorized redirect URIs:
   - `https://your-project-ref.supabase.co/auth/v1/callback`
   - For local development: `http://localhost:54321/auth/v1/callback`

#### Step 2: Configure in Supabase
1. Go to your Supabase dashboard
2. Navigate to Authentication → Providers
3. Enable Google provider
4. Enter your Google Client ID and Client Secret
5. Save the configuration

## URL Configuration

### Site URL Configuration
Make sure your Site URL is correctly configured in Supabase:

1. Go to Authentication → URL Configuration
2. Set Site URL to your production domain (e.g., `https://yourdomain.com`)
3. Add redirect URLs:
   - `https://yourdomain.com/auth/callback`
   - For development: `http://localhost:3000/auth/callback`

### Environment Variables

Ensure these environment variables are set:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=https://yourdomain.com  # or http://localhost:3000 for development
```

## Implementation Details

### Auth Library Functions

The following functions have been added to `lib/auth.ts`:

- `signInWithProvider(provider)` - Generic OAuth sign-in
- `signInWithGoogle()` - Google-specific sign-in

### SocialLogin Component

The `SocialLogin` component (`components/auth/social-login.tsx`) provides:
- Google OAuth integration
- Loading states and error handling
- Proper accessibility features
- Responsive design

### Usage

```tsx
import { SocialLogin } from '@/components/auth/social-login';

// For login page
<SocialLogin mode="login" />

// For signup page
<SocialLogin mode="signup" />
```

## Testing

### Local Development
1. Configure Google OAuth provider with localhost redirect URLs
2. Use Supabase local development URLs for testing
3. Test the Google authentication flow

### Production
1. Update Google OAuth provider with production URLs
2. Verify Site URL configuration in Supabase
3. Test the complete authentication flow

## Security Considerations

1. **Redirect URL Validation**: Ensure only authorized redirect URLs are configured
2. **HTTPS Only**: Use HTTPS in production for all OAuth flows
3. **Client Secret Security**: Keep client secrets secure and never expose them in client-side code
4. **Scope Limitations**: Request only necessary permissions from Google OAuth

## Troubleshooting

### Common Issues

1. **Invalid Redirect URI**
   - Verify redirect URLs match exactly in both Google Console and Supabase configuration
   - Check for trailing slashes and protocol mismatches

2. **Provider Not Enabled**
   - Ensure the Google provider is enabled in Supabase dashboard
   - Verify client credentials are correctly entered

3. **CORS Issues**
   - Check Site URL configuration in Supabase
   - Verify domain is properly configured in Google OAuth

4. **Development vs Production**
   - Use different OAuth apps for development and production
   - Ensure environment variables are correctly set for each environment

## Support

For additional help:
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2) 