import { createClient } from '@supabase/supabase-js';

// createSupabaseAdmin: returns a Supabase client authenticated with the service-role key.
// This client bypasses RLS and is intended **only** for trusted server code such as route handlers.
export const createSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing required Supabase environment variables for admin client'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey);
};
