#!/usr/bin/env node

/**
 * Script to apply the create_full_profile migration
 * Run this script to add the new stored procedure to your database
 */

const fs = require('fs');
const path = require('path');

async function applyMigration() {
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250129_create_full_profile_procedure.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Migration SQL loaded successfully');
    console.log('='.repeat(60));
    console.log('To apply this migration to your Supabase database:');
    console.log('');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the following SQL:');
    console.log('');
    console.log('='.repeat(60));
    console.log(migrationSQL);
    console.log('='.repeat(60));
    console.log('');
    console.log('4. Click "Run" to execute the migration');
    console.log('');
    console.log('Alternatively, if you have Supabase CLI installed:');
    console.log('supabase db push');
    
  } catch (error) {
    console.error('Error reading migration file:', error.message);
    process.exit(1);
  }
}

applyMigration(); 