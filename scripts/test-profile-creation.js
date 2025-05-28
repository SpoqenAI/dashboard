#!/usr/bin/env node

/**
 * Profile Creation Test Script
 * 
 * This script helps test and verify that the profile creation
 * functionality is working correctly.
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Profile Creation Implementation Test\n');

// Check if all required files exist
const requiredFiles = [
  'lib/profile.ts',
  'lib/auth.ts',
  'app/auth/callback/route.ts',
  'PROFILE_CREATION_SOLUTION.md'
];

console.log('📁 Checking required files...');
let missingFiles = [];

requiredFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    missingFiles.push(file);
  }
});

if (missingFiles.length > 0) {
  console.log('\n❌ Some required files are missing. Please check the implementation.');
  console.log('Missing files:', missingFiles.join(', '));
  process.exit(1);
}

// Check if profile.ts contains required functions
console.log('\n🔍 Checking profile.ts functions...');
let profileContent;
try {
  profileContent = fs.readFileSync(path.join(process.cwd(), 'lib/profile.ts'), 'utf8');
} catch (error) {
  console.log(`  ❌ Error reading lib/profile.ts: ${error.message}`);
  console.log('\n❌ Cannot continue without profile.ts file. Please check the file exists and is readable.');
  process.exit(1);
}

const requiredFunctions = [
  'createUserProfile',
  'createProfileFromAuthUser',
  'ensureUserProfile',
  'checkProfileExists'
];

let missingFunctions = [];

requiredFunctions.forEach(func => {
  if (profileContent.includes(`export async function ${func}`)) {
    console.log(`  ✅ ${func}`);
  } else {
    console.log(`  ❌ ${func} - MISSING`);
    missingFunctions.push(func);
  }
});

// Check if auth.ts has been updated
console.log('\n🔍 Checking auth.ts integration...');
let authContent;
try {
  authContent = fs.readFileSync(path.join(process.cwd(), 'lib/auth.ts'), 'utf8');
} catch (error) {
  console.log(`  ❌ Error reading lib/auth.ts: ${error.message}`);
  console.log('\n❌ Cannot continue without auth.ts file. Please check the file exists and is readable.');
  process.exit(1);
}

let authIssues = [];

if (authContent.includes('import { createUserProfile }')) {
  console.log('  ✅ Profile import added');
} else {
  console.log('  ❌ Profile import missing');
  authIssues.push('Profile import missing');
}

if (authContent.includes('await createUserProfile(')) {
  console.log('  ✅ Profile creation call added');
} else {
  console.log('  ❌ Profile creation call missing');
  authIssues.push('Profile creation call missing');
}

// Check if callback route has been updated
console.log('\n🔍 Checking auth callback integration...');
let callbackContent;
try {
  callbackContent = fs.readFileSync(path.join(process.cwd(), 'app/auth/callback/route.ts'), 'utf8');
} catch (error) {
  console.log(`  ❌ Error reading app/auth/callback/route.ts: ${error.message}`);
  console.log('\n❌ Cannot continue without callback route file. Please check the file exists and is readable.');
  process.exit(1);
}

let callbackIssues = [];

if (callbackContent.includes('import { ensureUserProfile }')) {
  console.log('  ✅ ensureUserProfile import added');
} else {
  console.log('  ❌ ensureUserProfile import missing');
  callbackIssues.push('ensureUserProfile import missing');
}

if (callbackContent.includes('await ensureUserProfile(')) {
  console.log('  ✅ ensureUserProfile call added');
} else {
  console.log('  ❌ ensureUserProfile call missing');
  callbackIssues.push('ensureUserProfile call missing');
}

// Final result
console.log('\n' + '='.repeat(50));
const allImplementationComplete = missingFunctions.length === 0 && authIssues.length === 0 && callbackIssues.length === 0;

if (allImplementationComplete) {
  console.log('🎉 Profile Creation Implementation: COMPLETE');
  console.log('\n✅ All required files and functions are present');
  console.log('✅ Auth integration is properly configured');
  console.log('✅ OAuth callback integration is complete');
  
  console.log('\n📋 Next Steps:');
  console.log('  1. Test email/password signup flow');
  console.log('  2. Test OAuth signup flow');
  console.log('  3. Verify profiles are created in database');
  console.log('  4. Check console logs for any errors');
  
  console.log('\n📖 Documentation:');
  console.log('  • Read PROFILE_CREATION_SOLUTION.md for complete details');
  console.log('  • Use the monitoring queries to check success rates');
  console.log('  • Review console logs for debugging information');
  
} else {
  console.log('❌ Profile Creation Implementation: INCOMPLETE');
  console.log('\n🔧 Please fix the missing components above');
  
  if (missingFunctions.length > 0) {
    console.log('Missing functions:', missingFunctions.join(', '));
  }
  if (authIssues.length > 0) {
    console.log('Auth integration issues:', authIssues.join(', '));
  }
  if (callbackIssues.length > 0) {
    console.log('Callback integration issues:', callbackIssues.join(', '));
  }
}

console.log('\n' + '='.repeat(50)); 