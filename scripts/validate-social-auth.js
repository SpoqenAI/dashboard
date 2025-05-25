#!/usr/bin/env node

/**
 * Google Authentication Implementation Validation
 * 
 * This script validates that all required files and functions
 * for Google authentication are properly implemented.
 */

const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'lib/auth.ts',
  'components/auth/social-login.tsx',
  'app/login/page.tsx',
  'app/signup/page.tsx',
  'SOCIAL_AUTH_SETUP.md'
];

const requiredFunctions = [
  'signInWithProvider',
  'signInWithGoogle'
];

console.log('🔍 Validating Google Authentication Implementation...\n');

// Check if all required files exist
console.log('📁 Checking required files:');
let allFilesExist = true;

requiredFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  const exists = fs.existsSync(filePath);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

if (!allFilesExist) {
  console.log('\n❌ Some required files are missing!');
  process.exit(1);
}

// Check auth.ts for required functions
console.log('\n🔧 Checking auth functions:');
let authContent;
try {
  authContent = fs.readFileSync('lib/auth.ts', 'utf8');
} catch (error) {
  console.log('❌ Error reading lib/auth.ts:', error.message);
  process.exit(1);
}

requiredFunctions.forEach(func => {
  const hasFunction = authContent.includes(`export async function ${func}`);
  console.log(`  ${hasFunction ? '✅' : '❌'} ${func}`);
});

// Check that Apple and Facebook functions are removed
const removedFunctions = ['signInWithApple', 'signInWithFacebook'];
removedFunctions.forEach(func => {
  const hasFunction = authContent.includes(`export async function ${func}`);
  console.log(`  ${!hasFunction ? '✅' : '❌'} ${func} (should be removed)`);
});

// Check if SocialLogin component is properly imported in pages
console.log('\n📄 Checking page integrations:');

const loginContent = fs.readFileSync('app/login/page.tsx', 'utf8');
const hasLoginImport = loginContent.includes('import { SocialLogin }');
const hasLoginUsage = loginContent.includes('<SocialLogin mode="login"');
console.log(`  ${hasLoginImport && hasLoginUsage ? '✅' : '❌'} Login page integration`);

const signupContent = fs.readFileSync('app/signup/page.tsx', 'utf8');
const hasSignupImport = signupContent.includes('import { SocialLogin }');
const hasSignupUsage = signupContent.includes('<SocialLogin mode="signup"');
console.log(`  ${hasSignupImport && hasSignupUsage ? '✅' : '❌'} Signup page integration`);

// Check SocialLogin component structure
console.log('\n🎨 Checking SocialLogin component:');
const socialLoginContent = fs.readFileSync('components/auth/social-login.tsx', 'utf8');

const checks = [
  { name: 'Google icon', check: socialLoginContent.includes('GoogleIcon') },
  { name: 'Apple icon removed', check: !socialLoginContent.includes('AppleIcon') },
  { name: 'Facebook icon removed', check: !socialLoginContent.includes('FacebookIcon') },
  { name: 'Loading states', check: socialLoginContent.includes('isLoading') },
  { name: 'Error handling', check: socialLoginContent.includes('toast') },
  { name: 'Mode prop', check: socialLoginContent.includes('mode?:') },
  { name: 'Only Google import', check: socialLoginContent.includes('signInWithGoogle') && !socialLoginContent.includes('signInWithApple') && !socialLoginContent.includes('signInWithFacebook') }
];

checks.forEach(({ name, check }) => {
  console.log(`  ${check ? '✅' : '❌'} ${name}`);
});

console.log('\n📚 Documentation:');
const hasSetupGuide = fs.existsSync('SOCIAL_AUTH_SETUP.md');
console.log(`  ${hasSetupGuide ? '✅' : '❌'} Setup guide available`);

console.log('\n🎉 Google Authentication implementation validation complete!');
console.log('\n📋 Next steps:');
console.log('  1. Configure Google OAuth provider in Supabase dashboard');
console.log('  2. Set up Google OAuth application in Google Cloud Console');
console.log('  3. Update environment variables');
console.log('  4. Test the Google authentication flow');
console.log('\n📖 See SOCIAL_AUTH_SETUP.md for detailed instructions.'); 