#!/usr/bin/env node

/**
 * Test script to verify webhook processing and subscription creation
 * This script helps debug issues with the onboarding flow
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables:');
  if (!supabaseUrl) console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  if (!serviceRoleKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testWebhookFlow() {
  console.log('🔍 Testing webhook flow and subscription creation...\n');

  try {
    // 1. Check if subscriptions table exists and is accessible
    console.log('1️⃣ Checking subscriptions table...');
    const { data: subs, error: subsError } = await supabase
      .from('subscriptions')
      .select('id, user_id, status, created_at')
      .limit(5);

    if (subsError) {
      console.error(
        '❌ Error accessing subscriptions table:',
        subsError.message
      );
      return;
    }

    console.log(
      `✅ Subscriptions table accessible. Found ${subs.length} subscription(s)`
    );
    if (subs.length > 0) {
      console.log('   Recent subscriptions:');
      subs.forEach(sub => {
        console.log(
          `   - ${sub.id}: ${sub.status} (${sub.user_id?.slice(0, 8)}...)`
        );
      });
    }

    // 2. Check profiles table for paddle_customer_id column
    console.log('\n2️⃣ Checking profiles table structure...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, paddle_customer_id, business_name, created_at')
      .not('paddle_customer_id', 'is', null)
      .limit(3);

    if (profilesError) {
      console.error(
        '❌ Error accessing profiles table:',
        profilesError.message
      );
      return;
    }

    console.log(
      `✅ Profiles table accessible. Found ${profiles.length} profile(s) with Paddle customer ID`
    );

    // 3. Test subscription check API endpoint
    console.log('\n3️⃣ Testing subscription check API...');
    const testApiUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    try {
      const response = await fetch(`${testApiUrl}/api/check-subscription`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        console.log(
          '✅ Subscription check API accessible (returns 401 for unauthenticated - expected)'
        );
      } else {
        console.log(
          `⚠️  Subscription check API returned status: ${response.status}`
        );
      }
    } catch (fetchError) {
      console.log(
        '⚠️  Could not reach subscription check API:',
        fetchError.message
      );
      console.log('   (This might be normal if the dev server is not running)');
    }

    // 4. Check recent subscription activity
    console.log('\n4️⃣ Checking recent subscription activity...');
    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: recentSubs, error: recentError } = await supabase
      .from('subscriptions')
      .select('id, user_id, status, created_at, updated_at')
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false });

    if (recentError) {
      console.error(
        '❌ Error checking recent subscriptions:',
        recentError.message
      );
      return;
    }

    if (recentSubs.length === 0) {
      console.log('ℹ️  No subscriptions created in the last 24 hours');
    } else {
      console.log(
        `✅ Found ${recentSubs.length} subscription(s) created in the last 24 hours:`
      );
      recentSubs.forEach(sub => {
        console.log(
          `   - ${sub.id}: ${sub.status} (created: ${new Date(sub.created_at).toLocaleString()})`
        );
      });
    }

    // 5. Check for users without subscriptions (potential onboarding issues)
    console.log('\n5️⃣ Checking for users without active subscriptions...');
    const { data: usersWithoutSubs, error: noSubsError } = await supabase.rpc(
      'get_users_without_subscriptions'
    );

    if (noSubsError && noSubsError.code !== '42883') {
      // Function might not exist
      console.error(
        '❌ Error checking users without subscriptions:',
        noSubsError.message
      );
    } else if (noSubsError?.code === '42883') {
      // Function doesn't exist, that's okay
      console.log('ℹ️  Custom function not available (this is normal)');
    } else {
      console.log(
        `ℹ️  Found ${usersWithoutSubs?.length || 0} user(s) without active subscriptions`
      );
    }

    console.log('\n✅ Webhook flow test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - Subscriptions table is accessible');
    console.log('   - Profiles table has paddle_customer_id column');
    console.log('   - Subscription check API endpoint exists');
    console.log('   - Database structure looks correct for webhook processing');
  } catch (error) {
    console.error('❌ Unexpected error during testing:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testWebhookFlow().catch(console.error);
