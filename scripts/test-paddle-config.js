#!/usr/bin/env node

/**
 * Test script to verify Paddle configuration
 * Run with: node scripts/test-paddle-config.js
 */

const { Paddle } = require('@paddle/paddle-node-sdk');
require('dotenv').config({ path: '.env.local' });

async function testPaddleConfig() {
  console.log('🧪 Testing Paddle Configuration...\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(
    'NEXT_PUBLIC_PADDLE_ENVIRONMENT:',
    process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT
  );
  console.log(
    'NEXT_PUBLIC_PADDLE_CLIENT_TOKEN:',
    process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ? 'Set ✅' : 'Missing ❌'
  );
  console.log(
    'PADDLE_API_KEY:',
    process.env.PADDLE_API_KEY ? 'Set ✅' : 'Missing ❌'
  );
  console.log(
    'NEXT_PUBLIC_PADDLE_PRICE_ID:',
    process.env.NEXT_PUBLIC_PADDLE_PRICE_ID
  );
  console.log(
    'PADDLE_WEBHOOK_SECRET:',
    process.env.PADDLE_WEBHOOK_SECRET ? 'Set ✅' : 'Missing ❌'
  );

  if (!process.env.PADDLE_API_KEY) {
    console.error('\n❌ PADDLE_API_KEY is required for API testing');
    return;
  }

  if (!process.env.NEXT_PUBLIC_PADDLE_PRICE_ID) {
    console.error('\n❌ NEXT_PUBLIC_PADDLE_PRICE_ID is required for testing');
    return;
  }

  // Determine the correct API URL based on environment
  const environment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'sandbox';
  const apiUrl =
    environment === 'sandbox'
      ? 'https://sandbox-api.paddle.com'
      : 'https://api.paddle.com';

  console.log('\n🌐 Using API URL:', apiUrl);

  // Initialize Paddle with the correct environment
  const paddle = new Paddle(process.env.PADDLE_API_KEY, {
    environment: environment === 'sandbox' ? 'sandbox' : 'production',
  });

  try {
    console.log('\n🔍 Testing Price ID...');

    // Check if the price exists
    const price = await paddle.prices.get(
      process.env.NEXT_PUBLIC_PADDLE_PRICE_ID
    );
    console.log('✅ Price found:');
    console.log('  - ID:', price.id);
    console.log('  - Name:', price.name);
    console.log('  - Status:', price.status);
    console.log(
      '  - Unit Price:',
      price.unitPrice.amount,
      price.unitPrice.currencyCode
    );
    console.log('  - Product ID:', price.productId);

    if (price.status !== 'active') {
      console.warn(
        '⚠️  Warning: Price is not active. This may cause checkout failures.'
      );
    }

    // Check the related product
    console.log('\n🔍 Testing Related Product...');
    const product = await paddle.products.get(price.productId);
    console.log('✅ Product found:');
    console.log('  - ID:', product.id);
    console.log('  - Name:', product.name);
    console.log('  - Status:', product.status);

    if (product.status !== 'active') {
      console.warn(
        '⚠️  Warning: Product is not active. This may cause checkout failures.'
      );
    }

    // Test a simple transaction preview (this will help identify checkout issues)
    console.log('\n🔍 Testing Transaction Preview...');
    const transactionPreview = await paddle.transactions.preview({
      items: [
        {
          priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID,
          quantity: 1,
        },
      ],
    });

    console.log('✅ Transaction preview successful:');
    console.log('  - Currency:', transactionPreview.currencyCode);
    console.log('  - Total:', transactionPreview.totals.total);
    console.log('  - Tax Total:', transactionPreview.totals.tax);

    console.log('\n✅ All Paddle configuration tests passed!');
    console.log('\n💡 If checkout is still failing, the issue might be:');
    console.log('   1. Checkout not enabled for your account');
    console.log('   2. Missing default payment link configuration');
    console.log('   3. Sandbox account limitations');
    console.log('   4. Browser/client-side configuration issues');
  } catch (error) {
    console.error('\n❌ Paddle configuration test failed:');
    console.error('Error:', error.message);

    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error(
        'Response data:',
        JSON.stringify(error.response.data, null, 2)
      );
    }

    if (error.message.includes('not found')) {
      console.error(
        '\n💡 This means the price ID does not exist in your Paddle account.'
      );
      console.error(
        '   Please check your Paddle dashboard and ensure the price ID is correct.'
      );
    }

    if (error.message.includes('permitted')) {
      console.error(
        '\n💡 This is likely an API endpoint/environment mismatch.'
      );
      console.error(
        '   Make sure you are using sandbox API keys with sandbox environment.'
      );
      console.error('   Current environment:', environment);
      console.error('   API URL:', apiUrl);
    }
  }
}

testPaddleConfig().catch(console.error);
