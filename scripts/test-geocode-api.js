#!/usr/bin/env node

/**
 * Test script for the Geocode API
 *
 * Usage:
 *   node scripts/test-geocode-api.js
 *
 * Make sure your development server is running on port 3000
 */

const https = require('https');
const http = require('http');

const baseUrl = process.env.TEST_URL || 'http://localhost:3000';
const testQueries = [
  'New York, NY',
  'San Francisco',
  'London, UK',
  'Paris, France',
  '1600 Pennsylvania Avenue, Washington DC',
];

async function testGeocodeAPI() {
  console.log('🧪 Testing Geocode API...\n');
  console.log(`Base URL: ${baseUrl}\n`);

  for (const query of testQueries) {
    console.log(`🔍 Testing: "${query}"`);

    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `${baseUrl}/api/geocode?text=${encodedQuery}&limit=3`;

      const response = await fetchWithTimeout(url, 10000);

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`  ❌ Error ${response.status}: ${errorText}\n`);
        continue;
      }

      const data = await response.json();

      if (!data.features || !Array.isArray(data.features)) {
        console.log(`  ❌ Invalid response format\n`);
        continue;
      }

      console.log(`  ✅ Found ${data.features.length} results`);

      // Show first result if available
      if (data.features.length > 0) {
        const first = data.features[0];
        const props = first.properties;
        console.log(`     📍 ${props.formatted || 'No formatted address'}`);
        console.log(`     🌍 ${props.country || 'Unknown country'}`);
      }

      console.log('');
    } catch (error) {
      console.log(`  ❌ Request failed: ${error.message}\n`);
    }
  }
}

// Fetch with timeout utility
async function fetchWithTimeout(url, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'test-script/1.0',
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Polyfill fetch for older Node.js versions
if (typeof fetch === 'undefined') {
  console.log('⚠️  fetch not available, using node-fetch fallback...');

  function makeRequest(url) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const lib = urlObj.protocol === 'https:' ? https : http;

      const req = lib.request(
        url,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'test-script/1.0',
          },
        },
        res => {
          let data = '';
          res.on('data', chunk => (data += chunk));
          res.on('end', () => {
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              json: () => Promise.resolve(JSON.parse(data)),
              text: () => Promise.resolve(data),
            });
          });
        }
      );

      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      req.end();
    });
  }

  global.fetch = makeRequest;
}

// Run the test
testGeocodeAPI().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
