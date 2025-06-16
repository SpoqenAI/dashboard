/**
 * Debug script for subscription issues
 * Usage: node scripts/debug-subscription.js [user_id]
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function debugSubscription(userId) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    console.log('Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Debugging subscription status...\n');

  try {
    // Check if subscriptions table exists and has data
    console.log('📊 Checking subscriptions table...');
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (subError) {
      console.error('❌ Error querying subscriptions table:', subError.message);
    } else {
      console.log(`✅ Found ${subscriptions.length} subscription(s) in subscriptions table:`);
      subscriptions.forEach((sub, index) => {
        console.log(`   Subscription ${index + 1}:`, {
          id: sub.id,
          status: sub.status,
          price_id: sub.price_id,
          current_period_end: sub.current_period_end_at,
        });
      });
    }

    // Check if user_subscriptions table exists and has data
    console.log('\n📊 Checking user_subscriptions table...');
    const { data: userSubs, error: userSubError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('id', userId);

    if (userSubError) {
      console.error('❌ Error querying user_subscriptions table:', userSubError.message);
    } else {
      console.log(`✅ Found ${userSubs.length} subscription(s) in user_subscriptions table:`);
      userSubs.forEach((sub, index) => {
        console.log(`   Subscription ${index + 1}:`, {
          plan_type: sub.plan_type,
          status: sub.status,
          current_period_end: sub.current_period_end,
        });
      });
    }

    // Check profile data
    console.log('\n👤 Checking profile data...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, paddle_customer_id, stripe_customer_id')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('❌ Error querying profile:', profileError.message);
    } else {
      console.log('✅ Profile data:', {
        id: profile.id,
        email: profile.email,
        paddle_customer_id: profile.paddle_customer_id,
        stripe_customer_id: profile.stripe_customer_id,
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Get user ID from command line argument or use a default for testing
const userId = process.argv[2];

if (!userId) {
  console.log('Usage: node scripts/debug-subscription.js [user_id]');
  console.log('Example: node scripts/debug-subscription.js 12345678-1234-1234-1234-123456789012');
  process.exit(1);
}

debugSubscription(userId); 