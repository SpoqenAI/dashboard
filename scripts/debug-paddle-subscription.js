#!/usr/bin/env node
/**
 * Debug script for Paddle subscription integration
 * Run with: node scripts/debug-paddle-subscription.js [user_id]
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugSubscription(userId) {
  console.log('🔍 Debugging Paddle subscription integration...');
  console.log('👤 User ID:', userId);
  
  try {
    // Check if user exists
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError) {
      console.error('❌ Error fetching user:', userError);
      return;
    }
    
    console.log('✅ User found:', userData.user.email);
    
    // Check profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
    } else {
      console.log('✅ Profile found:', {
        email: profile.email,
        paddle_customer_id: profile.paddle_customer_id,
        created_at: profile.created_at,
      });
    }
    
    // Check subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (subError) {
      console.error('❌ Error fetching subscriptions:', subError);
    } else {
      console.log(`📊 Found ${subscriptions.length} subscription(s):`);
      subscriptions.forEach((sub, index) => {
        console.log(`  ${index + 1}. Subscription ID: ${sub.id}`);
        console.log(`     Status: ${sub.status}`);
        console.log(`     Price ID: ${sub.price_id}`);
        console.log(`     Current period: ${sub.current_period_start_at} to ${sub.current_period_end_at}`);
        console.log(`     Created: ${sub.created_at}`);
        console.log('');
      });
    }
    
    // Test subscription query (same as useSubscription hook)
    const { data: latestSub, error: latestError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('current_period_start_at', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (latestError) {
      console.error('❌ Error fetching latest subscription:', latestError);
    } else {
      console.log('🎯 Latest subscription (as used by useSubscription hook):', latestSub ? {
        id: latestSub.id,
        status: latestSub.status,
        price_id: latestSub.price_id,
        current_period_end: latestSub.current_period_end_at,
      } : 'No subscription found');
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

async function listAllSubscriptions() {
  console.log('📊 Listing all subscriptions...');
  
  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      id,
      user_id,
      status,
      price_id,
      current_period_end_at,
      created_at,
      profiles!inner(email, first_name, last_name)
    `)
    .order('created_at', { ascending: false })
    .limit(20);
    
  if (error) {
    console.error('❌ Error fetching all subscriptions:', error);
    return;
  }
  
  console.log(`Found ${data.length} recent subscriptions:`);
  data.forEach((sub, index) => {
    console.log(`${index + 1}. ${sub.profiles.email} (${sub.profiles.first_name} ${sub.profiles.last_name})`);
    console.log(`   Subscription: ${sub.id}`);
    console.log(`   Status: ${sub.status}`);
    console.log(`   User ID: ${sub.user_id}`);
    console.log(`   Created: ${sub.created_at}`);
    console.log('');
  });
}

// CLI interface
const command = process.argv[2];
const userId = process.argv[3];

if (command === 'list') {
  listAllSubscriptions();
} else if (userId) {
  debugSubscription(userId);
} else {
  console.log('Usage:');
  console.log('  node scripts/debug-paddle-subscription.js [user_id] - Debug specific user');
  console.log('  node scripts/debug-paddle-subscription.js list - List all subscriptions');
  console.log('');
  console.log('Example:');
  console.log('  node scripts/debug-paddle-subscription.js cf1805db-401e-4cac-8a54-0f4ea54eafa3');
} 