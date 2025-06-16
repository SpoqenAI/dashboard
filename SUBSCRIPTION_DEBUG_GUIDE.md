# Subscription Status Debug Guide

## Problem

Paddle checkout works, but the subscription status card shows "No Active Subscription" even though the user has paid for a subscription.

## Root Cause Analysis

The issue is likely one of the following:

1. **Database Schema Mismatch**: App expects `subscriptions` table but only has `user_subscriptions`
2. **Webhook Not Configured**: Paddle webhooks aren't reaching your app
3. **Webhook Processing Error**: Webhooks are received but failing to process
4. **Frontend Data Fetching Issue**: Data exists but UI isn't showing it

## ✅ Fixes Applied

### 1. Database Schema Fixed

- ✅ Created `subscriptions` table with proper Paddle schema
- ✅ Added `paddle_customer_id` column to profiles table
- ✅ Added proper indexes and RLS policies

### 2. Enhanced Debugging

- ✅ Added console logging to `useSubscription` hook
- ✅ Added detailed logging to webhook handler
- ✅ Created debug scripts to check database state

## 🔍 Debugging Steps

### Step 1: Check Browser Console

1. Open your app in the browser
2. Navigate to `/settings?tab=billing`
3. Open Developer Tools → Console
4. Look for logs starting with `📊 Subscription data fetched:`

**What to look for:**

- `subscriptionFound: true/false` - tells you if data exists
- `subscriptionData: {...}` - shows actual subscription details
- Any error messages

### Step 2: Check Database State

Get your user ID from the Supabase dashboard or auth panel, then run:

```bash
node scripts/debug-subscription.js YOUR_USER_ID_HERE
```

This will show you:

- Data in `subscriptions` table (new Paddle table)
- Data in `user_subscriptions` table (old table)
- Profile data including `paddle_customer_id`

### Step 3: Verify Webhook Configuration

1. **Check Paddle Dashboard:**

   - Go to Developer Tools → Notifications
   - Verify webhook URL: `https://your-domain.com/api/webhooks/paddle`
   - Verify events selected: `subscription.created`, `subscription.updated`, `subscription.canceled`

2. **Check Webhook Secret:**

   - Make sure `PADDLE_WEBHOOK_SECRET` in `.env.local` matches Paddle dashboard

3. **Test Webhook Locally (if needed):**
   ```bash
   ./scripts/setup-ngrok.sh
   # Update Paddle webhook URL to use ngrok URL
   ```

### Step 4: Check Application Logs

1. **For Production:** Check Vercel/deployment logs for webhook processing
2. **For Development:** Check terminal where `pnpm dev` is running

Look for:

- `✅ Processed subscription [id] for user [user_id]` - successful webhook processing
- Any error messages from webhook handler

## 🚀 Quick Fix: Manual Subscription Insert

If you need to test the UI immediately and have a confirmed payment, you can manually insert subscription data:

1. Get your user ID from Supabase dashboard
2. Get subscription ID and customer ID from Paddle dashboard
3. Run:

```bash
node scripts/insert-test-subscription.js YOUR_USER_ID SUBSCRIPTION_ID CUSTOMER_ID
```

Example:

```bash
node scripts/insert-test-subscription.js 12345678-1234-1234-1234-123456789012 sub_01abc123 ctm_01def456
```

After running this, the subscription status should immediately show as active in your app.

## 🔧 Common Issues & Solutions

### Issue 1: "subscriptions" table doesn't exist

**Solution:** The migration should have fixed this. If not, check Supabase logs and make sure migration ran successfully.

### Issue 2: Webhooks not reaching app

**Solutions:**

- Verify webhook URL in Paddle dashboard
- Check that webhook endpoint is publicly accessible
- Verify `PADDLE_WEBHOOK_SECRET` matches

### Issue 3: Webhook signature verification failing

**Solutions:**

- Double-check `PADDLE_WEBHOOK_SECRET` in environment variables
- Make sure webhook secret in Paddle dashboard matches

### Issue 4: User ID missing in webhook custom_data

**Solutions:**

- Verify your checkout flow is passing `user_id` in custom data
- Check the checkout implementation in settings page

## 📝 Environment Variables Checklist

Make sure these are set in `.env.local`:

```bash
# Paddle Configuration
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=your_client_token
NEXT_PUBLIC_PADDLE_PRICE_ID=your_price_id
PADDLE_API_KEY=your_api_key
PADDLE_WEBHOOK_SECRET=your_webhook_secret

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🎯 Next Steps

1. Run through the debugging steps above
2. Check the browser console when visiting the billing page
3. Run the debug script to see what's in your database
4. If needed, use the manual subscription insert as a temporary fix
5. Verify webhook configuration in Paddle dashboard

## 🆘 Still Need Help?

If the issue persists:

1. **Share debug output:** Run the debug script and share the output
2. **Check browser console:** Share any error messages from the console
3. **Verify webhook logs:** Check if webhooks are being received
4. **Test payment flow:** Try a new test payment and monitor logs

The enhanced logging should now make it much easier to identify exactly where the issue is occurring.
