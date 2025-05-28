# Profile Creation Refactor: Atomic Transactions

## Overview

This refactor addresses the issue of non-atomic profile creation in `lib/profile.ts` by replacing sequential upserts with a single Postgres stored procedure call. This ensures all-or-nothing execution and maintains schema consistency.

## Problem

The original implementation in `createUserProfile()` performed three sequential upserts:

1. `profiles` table
2. `user_settings` table
3. `user_subscriptions` table

This approach had the following risks:

- **Partial data creation**: If any upsert failed, previous operations would remain committed
- **Inconsistent state**: Users could end up with incomplete profiles
- **No transaction safety**: Each operation was independent

## Solution

### 1. Database Changes

Created a new stored procedure `create_full_profile()` that:

- Performs all three upserts within a single transaction
- Includes comprehensive validation
- Provides detailed error handling
- Returns structured JSON response with all created records

**Migration File**: `supabase/migrations/20250129_create_full_profile_procedure.sql`

### 2. TypeScript Changes

Refactored `lib/profile.ts` to:

- Replace sequential upserts with single `supabase.rpc()` call
- Add proper TypeScript interfaces for response typing
- Maintain existing validation logic
- Improve error handling and logging

## Key Benefits

✅ **Atomic Operations**: All profile creation happens in a single transaction  
✅ **Data Consistency**: Either all records are created or none are  
✅ **Better Error Handling**: Centralized error management in the stored procedure  
✅ **Performance**: Single database round-trip instead of three  
✅ **Type Safety**: Proper TypeScript interfaces for response data  
✅ **Maintainability**: Database logic centralized in stored procedure

## Files Changed

### New Files

- `supabase/migrations/20250129_create_full_profile_procedure.sql` - Database migration
- `scripts/apply-migration.js` - Migration application script
- `PROFILE_CREATION_REFACTOR.md` - This documentation

### Modified Files

- `lib/profile.ts` - Refactored to use stored procedure

## How to Apply

### Option 1: Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/20250129_create_full_profile_procedure.sql`
4. Paste and run the SQL

### Option 2: Supabase CLI

```bash
supabase db push
```

### Option 3: Using the Script

```bash
node scripts/apply-migration.js
```

## API Changes

The `createUserProfile()` function now returns additional data:

```typescript
// Before
const result = await createUserProfile(userData);
// result: { success: true }

// After
const result = await createUserProfile(userData);
// result: {
//   success: true,
//   data: {
//     success: true,
//     user_id: string,
//     profile: ProfileRecord,
//     settings: SettingsRecord,
//     subscription: SubscriptionRecord
//   }
// }
```

## Validation

The stored procedure includes the same validation as the original TypeScript code:

- Required fields (user_id, email)
- Email format validation
- Phone number format validation (if provided)
- Avatar URL format validation (if provided)

## Error Handling

The stored procedure provides detailed error handling for:

- Unique constraint violations
- Foreign key constraint violations
- Check constraint violations
- Not null constraint violations
- General unexpected errors

## Testing

After applying the migration, test the functionality by:

1. Creating a new user account
2. Verifying all three records are created (profiles, user_settings, user_subscriptions)
3. Testing error scenarios (invalid email, etc.)
4. Checking that partial failures don't leave incomplete data

## Rollback

If needed, you can rollback by:

1. Dropping the stored procedure: `DROP FUNCTION IF EXISTS public.create_full_profile;`
2. Reverting the TypeScript changes in `lib/profile.ts`

## Security

The stored procedure is created with:

- `SECURITY DEFINER` - Runs with creator's privileges
- `SET search_path = public, pg_temp` - Prevents search path attacks
- Proper input validation and sanitization
- Row Level Security (RLS) policies still apply to underlying tables
