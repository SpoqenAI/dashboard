#!/usr/bin/env node

/**
 * Profile Creation Test Script
 *
 * This script helps test and verify that the profile creation
 * functionality is working correctly.
 */

const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

console.log('🧪 Profile Creation Implementation Test\n');

/**
 * Parse TypeScript/JavaScript code and extract exported async function names
 * @param {string} code - The source code to parse
 * @returns {string[]} - Array of exported async function names
 */
function extractExportedAsyncFunctions(code) {
  try {
    // Enhanced TypeScript preprocessing for better compatibility with Acorn
    const cleanedCode = code
      // Remove TypeScript interfaces (including nested ones)
      .replace(/export\s+interface\s+\w+\s*{[^{}]*(?:{[^{}]*}[^{}]*)*}/g, '')
      .replace(/interface\s+\w+\s*{[^{}]*(?:{[^{}]*}[^{}]*)*}/g, '')

      // Remove type aliases and type declarations
      .replace(/export\s+type\s+\w+\s*=[^;]+;/g, '')
      .replace(/type\s+\w+\s*=[^;]+;/g, '')

      // Remove import type statements
      .replace(/import\s+type\s+[^;]+;/g, '')

      // Remove generic type parameters from function declarations
      .replace(/(<[^>]*>)(?=\s*\()/g, '')

      // Remove return type annotations from functions
      .replace(/(\)\s*):\s*[^{=;]+(?=\s*[{=;])/g, '$1')

      // Remove parameter type annotations (more comprehensive)
      .replace(/(\w+)\s*:\s*[^,)=]+(?=[,)=])/g, '$1')

      // Remove variable type annotations
      .replace(/(\w+)\s*:\s*[^=,;{}()]+(?=\s*[=,;{}()])/g, '$1')

      // Remove as type assertions
      .replace(/\s+as\s+[^,;{}()]+/g, '')

      // Remove optional property markers
      .replace(/\?\s*:/g, ':')

      // Remove readonly modifiers
      .replace(/readonly\s+/g, '')

      // Clean up any remaining type annotations in destructuring
      .replace(/{([^}]*)}:\s*[^=,;{}()]+/g, '{$1}')

      // Remove any remaining angle brackets (generics)
      .replace(/<[^>]*>/g, '')

      // Clean up multiple spaces and newlines
      .replace(/\s+/g, ' ')
      .trim();

    const ast = acorn.parse(cleanedCode, {
      ecmaVersion: 2022,
      sourceType: 'module',
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
    });

    const exportedAsyncFunctions = [];

    function walk(node) {
      if (!node || typeof node !== 'object') return;

      // Handle export declarations
      if (node.type === 'ExportNamedDeclaration') {
        if (node.declaration) {
          // export async function name() {}
          if (
            node.declaration.type === 'FunctionDeclaration' &&
            node.declaration.async &&
            node.declaration.id
          ) {
            exportedAsyncFunctions.push(node.declaration.id.name);
          }
          // export const name = async function() {}
          else if (node.declaration.type === 'VariableDeclaration') {
            for (const declarator of node.declaration.declarations) {
              if (
                declarator.id &&
                declarator.id.name &&
                declarator.init &&
                ((declarator.init.type === 'FunctionExpression' &&
                  declarator.init.async) ||
                  (declarator.init.type === 'ArrowFunctionExpression' &&
                    declarator.init.async))
              ) {
                exportedAsyncFunctions.push(declarator.id.name);
              }
            }
          }
        }
        // export { name } where name is an async function
        else if (node.specifiers) {
          // This would require more complex analysis to determine if the exported
          // identifier refers to an async function defined elsewhere
        }
      }

      // Recursively walk all properties
      for (const key in node) {
        if (key === 'parent') continue; // Avoid circular references
        const child = node[key];
        if (Array.isArray(child)) {
          child.forEach(walk);
        } else if (child && typeof child === 'object') {
          walk(child);
        }
      }
    }

    walk(ast);
    return exportedAsyncFunctions;
  } catch (error) {
    console.log(
      `  ⚠️  AST parsing failed, falling back to regex: ${error.message}`
    );

    // Enhanced fallback regex patterns for better TypeScript support
    const patterns = [
      // Standard export async function
      /export\s+async\s+function\s+(\w+)/g,

      // export const name = async function
      /export\s+const\s+(\w+)\s*=\s*async\s+function/g,

      // export const name = async () =>
      /export\s+const\s+(\w+)\s*=\s*async\s*\(/g,

      // export const name: Type = async function
      /export\s+const\s+(\w+)\s*:\s*[^=]*=\s*async\s+function/g,

      // export const name: Type = async () =>
      /export\s+const\s+(\w+)\s*:\s*[^=]*=\s*async\s*\(/g,

      // Handle multiline declarations
      /export\s+async\s+function\s+(\w+)\s*[<(]/gm,
    ];

    const functions = [];
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        if (!functions.includes(match[1])) {
          functions.push(match[1]);
        }
      }
    });

    return functions;
  }
}

// Check if all required files exist
const requiredFiles = [
  'lib/profile.ts',
  'lib/auth.ts',
  'app/auth/callback/route.ts',
  'PROFILE_CREATION_SOLUTION.md',
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
  console.log(
    '\n❌ Some required files are missing. Please check the implementation.'
  );
  console.log('Missing files:', missingFiles.join(', '));
  process.exit(1);
}

// Check if profile.ts contains required functions
console.log('\n🔍 Checking profile.ts functions...');
let profileContent;
try {
  profileContent = fs.readFileSync(
    path.join(process.cwd(), 'lib/profile.ts'),
    'utf8'
  );
} catch (error) {
  console.log(`  ❌ Error reading lib/profile.ts: ${error.message}`);
  console.log(
    '\n❌ Cannot continue without profile.ts file. Please check the file exists and is readable.'
  );
  process.exit(1);
}

const requiredFunctions = [
  'createUserProfile',
  'createProfileFromAuthUser',
  'ensureUserProfile',
  'checkProfileExists',
];

let missingFunctions = [];

// Use AST-based function detection
const exportedAsyncFunctions = extractExportedAsyncFunctions(profileContent);

requiredFunctions.forEach(func => {
  if (exportedAsyncFunctions.includes(func)) {
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
  authContent = fs.readFileSync(
    path.join(process.cwd(), 'lib/auth.ts'),
    'utf8'
  );
} catch (error) {
  console.log(`  ❌ Error reading lib/auth.ts: ${error.message}`);
  console.log(
    '\n❌ Cannot continue without auth.ts file. Please check the file exists and is readable.'
  );
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
  callbackContent = fs.readFileSync(
    path.join(process.cwd(), 'app/auth/callback/route.ts'),
    'utf8'
  );
} catch (error) {
  console.log(
    `  ❌ Error reading app/auth/callback/route.ts: ${error.message}`
  );
  console.log(
    '\n❌ Cannot continue without callback route file. Please check the file exists and is readable.'
  );
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
const allImplementationComplete =
  missingFunctions.length === 0 &&
  authIssues.length === 0 &&
  callbackIssues.length === 0;

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
