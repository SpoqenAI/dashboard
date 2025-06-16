/**
 * Manually insert test subscription data
 * Usage: node scripts/insert-test-subscription.js [user_id] [subscription_id] [customer_id]
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function insertTestSubscription(userId, subscriptionId, customerId) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    console.log(
      'Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set'
    );
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('🔧 Inserting test subscription data...\n');

  try {
    // Insert subscription data
    const subscriptionData = {
      id: subscriptionId || `sub_test_${Date.now()}`,
      user_id: userId,
      status: 'active',
      price_id: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID || 'pri_test_123',
      quantity: 1,
      cancel_at_period_end: false,
      current_period_start_at: new Date().toISOString(),
      current_period_end_at: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(), // 30 days from now
      ended_at: null,
      canceled_at: null,
      trial_start_at: null,
      trial_end_at: null,
    };

    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert(subscriptionData)
      .select()
      .single();

    if (subError) {
      console.error('❌ Error inserting subscription:', subError.message);
      return;
    }

    console.log('✅ Subscription inserted:', subscription);

    // Update profile with customer ID
    if (customerId) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ paddle_customer_id: customerId })
        .eq('id', userId);

      if (profileError) {
        console.error('❌ Error updating profile:', profileError.message);
      } else {
        console.log('✅ Profile updated with customer ID:', customerId);
      }
    }

    console.log('\n🎉 Test subscription data inserted successfully!');
    console.log(
      'Now check your app - the subscription status should show as active.'
    );
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Get arguments
const userId = process.argv[2];
const subscriptionId = process.argv[3];
const customerId = process.argv[4];

if (!userId) {
  console.log(
    'Usage: node scripts/insert-test-subscription.js [user_id] [subscription_id] [customer_id]'
  );
  console.log(
    'Example: node scripts/insert-test-subscription.js 12345678-1234-1234-1234-123456789012'
  );
  console.log(
    '\nsubscription_id and customer_id are optional and will be auto-generated if not provided.'
  );
  process.exit(1);
}

insertTestSubscription(userId, subscriptionId, customerId);
