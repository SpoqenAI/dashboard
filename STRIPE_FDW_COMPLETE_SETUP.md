# Complete Stripe FDW Setup Guide

## Overview

I've successfully set up the foundation for Stripe Foreign Data Wrapper (FDW) in your Supabase database. This will give you real-time access to Stripe subscription data without relying solely on webhooks.

## What's Been Done

### 1. Database Structure

- ✅ Created `stripe` schema for FDW tables
- ✅ Set up foreign tables for customers, subscriptions, prices, products, and invoices
- ✅ Created helper views and functions for easy data access
- ✅ Added subscription cancellation function

### 2. API Endpoints

- ✅ Created `/api/stripe/cancel-subscription` endpoint
- ✅ Updated webhook to handle more subscription events
- ✅ Webhook now syncs subscription status to local database

### 3. Frontend Integration

- ✅ Updated billing settings page with cancel/reactivate buttons
- ✅ Added proper status badges and formatting
- ✅ Integrated with the `useStripeSubscription` hook

## What You Need to Do

### Step 1: Add Your Stripe API Key to Supabase Vault

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `supabase-spoqen-dashboard`
3. Navigate to **Settings** → **Vault**
4. Click **Add new secret**
5. Enter:
   - **Name**: `stripe_api_key`
   - **Value**: Your Stripe Secret Key (get it from [Stripe Dashboard](https://dashboard.stripe.com/apikeys))
   - **Description**: "Stripe API key for FDW"
6. Click **Save**

### Step 2: Get the Vault Secret UUID

Run this query in your Supabase SQL Editor:

```sql
SELECT id, name, description, created_at
FROM vault.secrets;
```

Copy the UUID from the result.

### Step 3: Update the FDW Server Configuration

Run this in your SQL Editor (replace `YOUR_UUID_HERE` with the actual UUID):

```sql
-- Update the server with your vault secret
ALTER SERVER stripe_server OPTIONS (
  DROP api_key,
  ADD api_key_id 'YOUR_UUID_HERE'
);
```

Alternatively, if you're in development and want to use the API key directly:

```sql
-- For development only - less secure
ALTER SERVER stripe_server OPTIONS (
  SET api_key 'sk_test_YOUR_STRIPE_SECRET_KEY'
);
```

### Step 4: Test the FDW Connection

Run this query to verify everything is working:

```sql
-- Test if FDW is working
SELECT COUNT(*) FROM stripe.customers;

-- Test the current user subscription view
SELECT * FROM current_user_subscription;
```

If you get results, the FDW is working!

### Step 5: Set Up Environment Variables

Make sure your `.env.local` has:

```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Step 6: Test the Complete Flow

1. **Create a subscription**: Visit Settings → Billing and subscribe
2. **Check subscription status**: The billing tab should show your active subscription
3. **Cancel subscription**: Click "Cancel Subscription" button
4. **Verify cancellation**: Should show "Your subscription will end on [date]"
5. **Reactivate**: Use the "Reactivate Subscription" button

## How It Works

### Data Flow

1. **Primary**: Stripe FDW provides real-time data directly from Stripe
2. **Fallback**: Local `user_subscriptions` table (updated via webhooks)
3. **Cache**: Subscription data is cached in the React hook

### Key Components

#### Database Functions

- `get_user_subscription_details()` - Gets subscription data with FDW fallback
- `cancel_user_subscription()` - Marks subscription for cancellation
- `current_user_subscription` view - Real-time subscription data

#### API Routes

- `/api/stripe/create-checkout-session` - Creates new subscriptions
- `/api/stripe/cancel-subscription` - Cancels subscriptions
- `/api/stripe/create-portal-session` - Opens Stripe billing portal
- `/api/stripe/webhook` - Syncs subscription changes

#### Frontend Hook

- `useStripeSubscription()` - Manages subscription state with automatic fallbacks

## Troubleshooting

### "relation 'stripe.customers' does not exist"

- Make sure you're on Supabase Pro plan or higher
- Verify the wrappers extension is enabled
- Check that the migration ran successfully

### "permission denied for foreign table"

- Run: `GRANT SELECT ON ALL TABLES IN SCHEMA stripe TO authenticated;`

### No subscription data showing

1. Check if user has `stripe_customer_id` in profiles table
2. Verify webhook is receiving events: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
3. Check browser console for errors

### FDW queries are slow

- This is normal for first query (cold start)
- Consider implementing pagination for large datasets
- Use specific columns instead of `SELECT *`

## Advanced Features

### Subscription Analytics

You can now query subscription metrics:

```sql
-- Active subscriptions by status
SELECT status, COUNT(*)
FROM stripe.subscriptions
WHERE status != 'canceled'
GROUP BY status;

-- Monthly recurring revenue
SELECT
  SUM(sp.unit_amount / 100) as mrr
FROM stripe.subscriptions ss
JOIN stripe.prices sp ON (ss.items->0->'price'->>'id')::text = sp.id
WHERE ss.status = 'active';
```

### Custom Subscription Plans

To add more plans, update:

1. Stripe products/prices in Stripe Dashboard
2. Update `/api/stripe/create-checkout-session` with new price IDs
3. Update plan type logic in database functions

## Security Best Practices

1. **Never expose API keys**: Always use Vault for production
2. **Use RLS**: Row Level Security ensures users only see their own data
3. **Validate webhooks**: Always verify webhook signatures
4. **Monitor usage**: Set up alerts for unusual subscription activity

## Next Steps

1. ✅ Complete the API key setup above
2. ✅ Test the subscription flow end-to-end
3. Consider adding:
   - Email notifications on subscription changes
   - Usage-based billing with Stripe Metered Billing
   - Team/organization subscriptions
   - Discount codes and promotions

## Support

If you encounter issues:

1. Check Supabase logs: Dashboard → Logs → Postgres
2. Check Stripe logs: [Stripe Dashboard → Developers → Logs](https://dashboard.stripe.com/logs)
3. Test webhook events: [Stripe Webhook Testing](https://stripe.com/docs/webhooks/test)

The implementation is designed to be resilient - even if FDW fails, the webhook fallback ensures your billing continues to work!
