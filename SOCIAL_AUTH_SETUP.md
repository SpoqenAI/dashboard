# Social Authentication Setup Guide

This guide explains how to configure social authentication providers (Google, Apple, Facebook) in Supabase for the Spoqen Dashboard.

## Overview

The social authentication feature has been implemented with the following components:
- Enhanced auth library with social login functions
- Reusable `SocialLogin` component
- Updated login and signup pages
- Proper error handling and loading states

## Supabase Configuration

To enable social authentication, you need to configure each provider in your Supabase dashboard.

### 1. Google OAuth Setup

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

### 2. Apple OAuth Setup

#### Step 1: Create Apple App ID
1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Navigate to Certificates, Identifiers & Profiles
3. Create a new App ID with Sign In with Apple capability
4. Create a Service ID for web authentication
5. Configure the Service ID with your domain and redirect URLs:
   - `https://your-project-ref.supabase.co/auth/v1/callback`

#### Step 2: Create Private Key
1. In Apple Developer Portal, go to Keys
2. Create a new key with Sign In with Apple capability
3. Download the private key file (.p8)

#### Step 3: Configure in Supabase
1. Go to your Supabase dashboard
2. Navigate to Authentication → Providers
3. Enable Apple provider
4. Enter:
   - Client ID (Service ID)
   - Team ID
   - Key ID
   - Private Key (content of the .p8 file)
5. Save the configuration

### 3. Facebook OAuth Setup

#### Step 1: Create Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Configure OAuth redirect URIs:
   - `https://your-project-ref.supabase.co/auth/v1/callback`

#### Step 2: Configure in Supabase
1. Go to your Supabase dashboard
2. Navigate to Authentication → Providers
3. Enable Facebook provider
4. Enter your Facebook App ID and App Secret
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
- `signInWithApple()` - Apple-specific sign-in
- `signInWithFacebook()` - Facebook-specific sign-in

### SocialLogin Component

The `SocialLogin` component (`components/auth/social-login.tsx`) provides:
- Consistent UI for all social providers
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
1. Configure OAuth providers with localhost redirect URLs
2. Use Supabase local development URLs for testing
3. Test each provider individually

### Production
1. Update all OAuth providers with production URLs
2. Verify Site URL configuration in Supabase
3. Test the complete authentication flow

## Security Considerations

1. **Redirect URL Validation**: Ensure only authorized redirect URLs are configured
2. **HTTPS Only**: Use HTTPS in production for all OAuth flows
3. **Client Secret Security**: Keep client secrets secure and never expose them in client-side code
4. **Scope Limitations**: Request only necessary permissions from OAuth providers

## Troubleshooting

### Common Issues

1. **Invalid Redirect URI**
   - Verify redirect URLs match exactly in both provider and Supabase configuration
   - Check for trailing slashes and protocol mismatches

2. **Provider Not Enabled**
   - Ensure the provider is enabled in Supabase dashboard
   - Verify client credentials are correctly entered

3. **CORS Issues**
   - Check Site URL configuration in Supabase
   - Verify domain is properly configured in OAuth provider

4. **Development vs Production**
   - Use different OAuth apps for development and production
   - Ensure environment variables are correctly set for each environment

## Support

For additional help:
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Apple Sign In Documentation](https://developer.apple.com/sign-in-with-apple/)
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login/) 