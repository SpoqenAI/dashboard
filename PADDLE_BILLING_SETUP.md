# Paddle Billing Integration Setup Guide

This guide walks you through setting up the complete Paddle billing and subscription management system for your Next.js SaaS application.

## Prerequisites

1. **Paddle Account**: You need a Paddle Sandbox account for testing
2. **Supabase Project**: Your existing Supabase project with authentication setup
3. **Next.js Application**: Your existing Next.js application with Supabase integration

## Part 1: Environment Variables Setup

Create a `.env.local` file in your project root with the following variables:

```bash
# Existing Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Paddle Configuration (add these new variables)
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=your_paddle_client_token_here
NEXT_PUBLIC_PADDLE_PRICE_ID=your_paddle_price_id_here
PADDLE_API_KEY=your_paddle_api_key_here
PADDLE_WEBHOOK_SECRET=your_paddle_webhook_secret_here
```

### How to Get Paddle Credentials:

1. **NEXT_PUBLIC_PADDLE_CLIENT_TOKEN**:

   - Go to [Paddle Sandbox Dashboard](https://sandbox-vendors.paddle.com/)
   - Navigate to **Developer Tools > Authentication**
   - Copy your **Client-side token**

2. **PADDLE_API_KEY**:

   - In the same **Authentication** section
   - Copy your **Server-side API key**

3. **NEXT_PUBLIC_PADDLE_PRICE_ID**:

   - This will be generated when you create a price in your product catalog (see Part 2)

4. **PADDLE_WEBHOOK_SECRET**:
   - Will be generated when you set up the webhook endpoint (see Part 3)

## Part 2: Paddle Product Catalog Setup

1. **Create a Product**:

   - Go to **Catalog > Products** in Paddle Dashboard
   - Click **New Product**
   - Fill in product details (e.g., "Professional Plan")

2. **Create a Price**:

   - Within your product, click **Add Price**
   - Set billing cycle (e.g., Monthly - $30)
   - Note the **Price ID** (starts with `pri_`)

3. **Update the Price ID**:
   - Copy the **Price ID** (starts with `pri_`)
   - Add it to your `.env.local` file:
   ```bash
   NEXT_PUBLIC_PADDLE_PRICE_ID=pri_01your_actual_price_id_here
   ```

## Part 3: Webhook Configuration

1. **Deploy Your Application**:

   - Deploy your app to Vercel, Netlify, or your hosting platform
   - Note your deployment URL (e.g., `https://your-app.vercel.app`)

2. **Set Up Webhook in Paddle**:

   - Go to **Developer Tools > Notifications**
   - Click **New Destination**
   - Set URL: `https://your-app-url.com/api/webhooks/paddle`
   - Under "Listen for events," select:
     - `subscription.created`
     - `subscription.updated`
     - `subscription.canceled`
   - Save the destination

3. **Copy Webhook Secret**:
   - After saving, copy the **Signing secret**
   - Add it to your `.env.local` as `PADDLE_WEBHOOK_SECRET`

## Part 4: Database Schema (Already Applied)

The following database changes have been applied to your Supabase project:

```sql
-- Added to profiles table
ALTER TABLE profiles ADD COLUMN paddle_customer_id TEXT;

-- New subscriptions table
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users (id) NOT NULL,
  status TEXT,
  price_id TEXT,
  quantity INTEGER,
  cancel_at_period_end BOOLEAN,
  current_period_start_at TIMESTAMPTZ,
  current_period_end_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  trial_start_at TIMESTAMPTZ,
  trial_end_at TIMESTAMPTZ
);
```

## Part 5: Testing the Integration

1. **Start Your Development Server**:

   ```bash
   pnpm dev
   ```

2. **Test Paddle Checkout**:

   - Navigate to `/settings?tab=billing`
   - Click **Change Plan** button
   - Complete a test transaction using Paddle's test cards

3. **Verify Webhook Processing**:
   - Check your application logs for webhook events
   - Verify subscription data appears in your Supabase `subscriptions` table

## Part 6: Production Deployment

1. **Switch to Production**:

   - Change Paddle environment from `sandbox` to `production`
   - Update all environment variables with production Paddle credentials

2. **Update Environment in Settings**:
   In `app/settings/page.tsx`, change:
   ```typescript
   environment: 'production', // Change from 'sandbox'
   ```

## Security Notes

- Never commit `.env.local` to version control
- Use different API keys for development and production
- Webhook endpoint automatically verifies Paddle signatures
- All sensitive operations happen server-side

## Troubleshooting

### Common Issues:

1. **Checkout doesn't open**:

   - Check `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` is correct
   - Verify `NEXT_PUBLIC_PADDLE_PRICE_ID` is set and valid
   - Verify user is logged in and has email

2. **Webhook not processing**:

   - Check `PADDLE_WEBHOOK_SECRET` matches Paddle dashboard
   - Verify webhook URL is publicly accessible
   - Check application logs for errors

3. **Database errors**:
   - Ensure Supabase schema changes were applied
   - Check Supabase connection and permissions

### Test Cards for Sandbox:

- **Successful Payment**: 4000 0000 0000 0002
- **Declined Payment**: 4000 0000 0000 0069
- **Expired Card**: 4000 0000 0000 0085

## Next Steps

- Customize the billing UI to match your brand
- Add subscription management features (upgrade/downgrade)
- Implement usage-based billing if needed
- Add email notifications for billing events
- Set up proper error handling and logging

Your Paddle billing integration is now complete! Users can purchase subscriptions, and the data will automatically sync to your Supabase database.
