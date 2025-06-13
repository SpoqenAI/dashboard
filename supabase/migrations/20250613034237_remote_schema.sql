

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "stripe";


ALTER SCHEMA "stripe" OWNER TO "postgres";


COMMENT ON SCHEMA "stripe" IS 'Stripe Foreign Data Wrapper tables for real-time billing data';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "wrappers" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."cancel_user_subscription"("user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_subscription_id text;
  v_result jsonb;
BEGIN
  -- Security check
  IF auth.uid() != user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  -- Get active subscription ID
  SELECT subscription_id INTO v_subscription_id
  FROM current_user_subscription
  WHERE user_id = auth.uid() AND subscription_status IN ('active', 'trialing');
  
  IF v_subscription_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No active subscription found'
    );
  END IF;
  
  -- Update local database to mark as canceling
  UPDATE user_subscriptions
  SET 
    cancel_at_period_end = true,
    updated_at = NOW()
  WHERE id = user_id;
  
  -- Return success with instruction to call Stripe API
  -- The actual cancellation should be done via the API route
  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_subscription_id,
    'message', 'Subscription marked for cancellation. Call /api/stripe/cancel-subscription to complete.'
  );
END;
$$;


ALTER FUNCTION "public"."cancel_user_subscription"("user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cancel_user_subscription"("user_id" "uuid") IS 'Mark subscription for cancellation - must be completed via API';



CREATE OR REPLACE FUNCTION "public"."create_full_profile"("p_user_id" "uuid", "p_email" "text", "p_first_name" "text" DEFAULT NULL::"text", "p_last_name" "text" DEFAULT NULL::"text", "p_full_name" "text" DEFAULT NULL::"text", "p_phone" "text" DEFAULT NULL::"text", "p_avatar_url" "text" DEFAULT NULL::"text") RETURNS "json"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $_$
DECLARE
    result JSON;
    profile_record RECORD;
    settings_record RECORD;
    subscription_record RECORD;
    current_user_id UUID;
BEGIN
    -- Get the current authenticated user ID
    current_user_id := auth.uid();
    
    -- Security check: Ensure user can only create/modify their own profile
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Access denied: No authenticated user session';
    END IF;
    
    IF current_user_id != p_user_id THEN
        RAISE EXCEPTION 'Access denied: You can only create/modify your own profile (user: %, requested: %)', current_user_id, p_user_id;
    END IF;
    
    -- Validation: Check if required fields are present
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;
    
    IF p_email IS NULL OR p_email = '' THEN
        RAISE EXCEPTION 'User email cannot be null or empty';
    END IF;
    
    -- Validate email format
    IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format: %', p_email;
    END IF;
    
    -- Validate phone number format if provided
    IF p_phone IS NOT NULL AND p_phone != '' THEN
        IF p_phone !~ '^[\+]?[0-9\(\)\-\s\.]{10,}$' THEN
            RAISE EXCEPTION 'Invalid phone number format: %', p_phone;
        END IF;
    END IF;
    
    -- Validate avatar URL format if provided
    IF p_avatar_url IS NOT NULL AND p_avatar_url != '' THEN
        IF p_avatar_url !~ '^https?://.*' THEN
            RAISE EXCEPTION 'Invalid avatar URL format: %', p_avatar_url;
        END IF;
    END IF;
    
    -- Begin atomic transaction
    BEGIN
        -- 1. Upsert profile record (RLS policies will be enforced)
        INSERT INTO public.profiles (
            id,
            email,
            first_name,
            last_name,
            full_name,
            phone,
            avatar_url,
            last_login,
            updated_at
        ) VALUES (
            p_user_id,
            p_email,
            NULLIF(trim(p_first_name), ''),
            NULLIF(trim(p_last_name), ''),
            NULLIF(trim(p_full_name), ''),
            NULLIF(trim(p_phone), ''),
            NULLIF(trim(p_avatar_url), ''),
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
            last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
            full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
            phone = COALESCE(EXCLUDED.phone, profiles.phone),
            avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
            last_login = NOW(),
            updated_at = NOW()
        RETURNING * INTO profile_record;
        
        -- 2. Upsert user settings with defaults (RLS policies will be enforced)
        INSERT INTO public.user_settings (
            id,
            updated_at
        )
        VALUES (
            p_user_id,
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            updated_at = NOW()
        RETURNING * INTO settings_record;
        
        -- 3. Upsert user subscription with free plan (RLS policies will be enforced)
        INSERT INTO public.user_subscriptions (
            id,
            plan_type,
            status,
            updated_at
        ) VALUES (
            p_user_id,
            'free',
            'active',
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            updated_at = NOW()
        RETURNING * INTO subscription_record;
        
        -- Build result JSON
        result := json_build_object(
            'success', true,
            'user_id', p_user_id,
            'profile', row_to_json(profile_record),
            'settings', row_to_json(settings_record),
            'subscription', row_to_json(subscription_record)
        );
        
        -- Log successful operation
        RAISE NOTICE 'Full profile creation completed for user %', p_user_id;
        
        RETURN result;
        
    EXCEPTION
        WHEN unique_violation THEN
            RAISE EXCEPTION 'Unique constraint violation during profile creation for user %: %', p_user_id, SQLERRM;
            
        WHEN foreign_key_violation THEN
            RAISE EXCEPTION 'Foreign key constraint violation during profile creation for user %: %', p_user_id, SQLERRM;
            
        WHEN check_violation THEN
            RAISE EXCEPTION 'Check constraint violation during profile creation for user %: %', p_user_id, SQLERRM;
            
        WHEN not_null_violation THEN
            RAISE EXCEPTION 'Not null constraint violation during profile creation for user %: %', p_user_id, SQLERRM;
            
        WHEN insufficient_privilege THEN
            RAISE EXCEPTION 'Access denied: Insufficient privileges to create profile for user %: %', p_user_id, SQLERRM;
            
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Unexpected error during profile creation for user %: % (SQLSTATE: %)', 
                p_user_id, SQLERRM, SQLSTATE;
    END;
END;
$_$;


ALTER FUNCTION "public"."create_full_profile"("p_user_id" "uuid", "p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_full_name" "text", "p_phone" "text", "p_avatar_url" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_full_profile"("p_user_id" "uuid", "p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_full_name" "text", "p_phone" "text", "p_avatar_url" "text") IS 'Creates a complete user profile atomically within a transaction. Uses SECURITY INVOKER to enforce RLS policies. Users can only create/modify their own profiles. Ensures updated_at is consistently set on both insert and update operations. Upserts records in profiles, user_settings, and user_subscriptions tables. Returns JSON with success status and created records.';



CREATE OR REPLACE FUNCTION "public"."get_user_data"("user_id" "uuid") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
DECLARE
    result JSON;
BEGIN
    -- Security check: users can only access their own data
    IF auth.uid() != user_id THEN
        RAISE EXCEPTION 'Access denied: You can only access your own user data';
    END IF;
    
    SELECT json_build_object(
        'profile', (SELECT row_to_json(p) FROM public.profiles p WHERE p.id = user_id),
        'settings', (SELECT row_to_json(s) FROM public.user_settings s WHERE s.id = user_id),
        'subscription', (SELECT row_to_json(sub) FROM public.user_subscriptions sub WHERE sub.id = user_id)
    ) INTO result;
    
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_user_data"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_subscription_details"("user_id" "uuid") RETURNS TABLE("has_active_subscription" boolean, "plan_type" "text", "subscription_status" "text", "current_period_start" timestamp with time zone, "current_period_end" timestamp with time zone, "cancel_at_period_end" boolean, "stripe_subscription_id" "text", "stripe_customer_id" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Security check
  IF auth.uid() != user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  -- Try to get data from Stripe FDW first
  BEGIN
    RETURN QUERY
    SELECT 
      CASE WHEN ss.status IN ('active', 'trialing') THEN true ELSE false END,
      CASE 
        WHEN ss.status IN ('active', 'trialing') THEN 'professional'::text
        ELSE 'free'::text
      END,
      ss.status::text,
      ss.current_period_start::timestamptz,
      ss.current_period_end::timestamptz,
      COALESCE(ss.cancel_at_period_end, false),
      ss.id::text,
      p.stripe_customer_id::text
    FROM profiles p
    LEFT JOIN stripe.customers sc ON p.stripe_customer_id = sc.id
    LEFT JOIN stripe.subscriptions ss ON sc.id = ss.customer AND ss.status != 'canceled'
    WHERE p.id = user_id
    ORDER BY ss.created DESC NULLS LAST
    LIMIT 1;
    
    -- If we got here, FDW worked
    RETURN;
  EXCEPTION WHEN OTHERS THEN
    -- FDW failed, fall back to local data
    RETURN QUERY
    SELECT 
      CASE WHEN us.status = 'active' THEN true ELSE false END,
      COALESCE(us.plan_type, 'free')::text,
      COALESCE(us.status, 'inactive')::text,
      us.current_period_start,
      us.current_period_end,
      COALESCE(us.cancel_at_period_end, false),
      us.stripe_subscription_id::text,
      p.stripe_customer_id::text
    FROM profiles p
    LEFT JOIN user_subscriptions us ON p.id = us.id
    WHERE p.id = user_id;
  END;
END;
$$;


ALTER FUNCTION "public"."get_user_subscription_details"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_subscription_status"("user_id" "uuid") RETURNS TABLE("is_subscribed" boolean, "plan_type" "text", "status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Allow users to check their own subscription status
  IF auth.uid() != user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT 
    CASE WHEN us.status = 'active' THEN true ELSE false END as is_subscribed,
    COALESCE(us.plan_type, 'free') as plan_type,
    COALESCE(us.status, 'inactive') as status
  FROM profiles p
  LEFT JOIN user_subscriptions us ON p.id = us.id
  WHERE p.id = user_id;
END;
$$;


ALTER FUNCTION "public"."get_user_subscription_status"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
    full_name_value TEXT;
    first_name_value TEXT;
    last_name_value TEXT;
    avatar_url_value TEXT;
    phone_value TEXT;
BEGIN
    -- Validation: Check if required fields are present
    IF NEW.id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;
    
    IF NEW.email IS NULL OR NEW.email = '' THEN
        RAISE EXCEPTION 'User email cannot be null or empty';
    END IF;
    
    -- Validate email format (basic check)
    IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format: %', NEW.email;
    END IF;
    
    -- Extract and validate metadata fields
    full_name_value := COALESCE(
        NEW.raw_user_meta_data->>'full_name', 
        NEW.raw_user_meta_data->>'name'
    );
    first_name_value := NEW.raw_user_meta_data->>'first_name';
    last_name_value := NEW.raw_user_meta_data->>'last_name';
    avatar_url_value := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url', 
        NEW.raw_user_meta_data->>'picture'
    );
    phone_value := COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone');
    
    -- Validate phone number format if provided
    IF phone_value IS NOT NULL AND phone_value != '' THEN
        -- Basic phone validation (allows various formats)
        IF phone_value !~ '^[\+]?[0-9\(\)\-\s\.]{10,}$' THEN
            RAISE EXCEPTION 'Invalid phone number format: %', phone_value;
        END IF;
    END IF;
    
    -- Validate avatar URL format if provided
    IF avatar_url_value IS NOT NULL AND avatar_url_value != '' THEN
        IF avatar_url_value !~ '^https?://.*' THEN
            RAISE EXCEPTION 'Invalid avatar URL format: %', avatar_url_value;
        END IF;
    END IF;
    
    -- Begin transaction block with error handling
    BEGIN
        -- Insert into profiles table
        INSERT INTO public.profiles (
            id,
            email,
            full_name,
            first_name,
            last_name,
            avatar_url,
            phone,
            last_login
        ) VALUES (
            NEW.id,
            NEW.email,
            full_name_value,
            first_name_value,
            last_name_value,
            avatar_url_value,
            phone_value,
            NOW()
        ) ON CONFLICT (id) DO NOTHING;
        
        -- Insert into user_settings table with defaults
        INSERT INTO public.user_settings (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
        
        -- Insert into user_subscriptions table with free plan
        INSERT INTO public.user_subscriptions (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
        
        -- Log successful operations
        RAISE NOTICE 'User profile creation completed for user %', NEW.id;
            
    EXCEPTION
        WHEN unique_violation THEN
            -- Handle unique constraint violations gracefully
            RAISE WARNING 'Unique constraint violation during user profile creation for user %: %', NEW.id, SQLERRM;
            -- Continue execution as this might be expected in some cases
            
        WHEN foreign_key_violation THEN
            -- Handle foreign key constraint violations
            RAISE EXCEPTION 'Foreign key constraint violation during user profile creation for user %: %', NEW.id, SQLERRM;
            
        WHEN check_violation THEN
            -- Handle check constraint violations
            RAISE EXCEPTION 'Check constraint violation during user profile creation for user %: %', NEW.id, SQLERRM;
            
        WHEN not_null_violation THEN
            -- Handle not null constraint violations
            RAISE EXCEPTION 'Not null constraint violation during user profile creation for user %: %', NEW.id, SQLERRM;
            
        WHEN OTHERS THEN
            -- Handle any other unexpected errors
            RAISE EXCEPTION 'Unexpected error during user profile creation for user %: % (SQLSTATE: %)', 
                NEW.id, SQLERRM, SQLSTATE;
    END;
    
    RETURN NEW;
END;
$_$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_ai_settings"("p_user_id" "uuid", "p_assistant_name" "text", "p_ai_greeting" "text", "p_first_name" "text" DEFAULT NULL::"text", "p_last_name" "text" DEFAULT NULL::"text", "p_business_name" "text" DEFAULT NULL::"text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    result JSON;
    settings_record RECORD;
    profile_record RECORD;
    profile_updates_made BOOLEAN := FALSE;
BEGIN
    -- Validation: Check if required fields are present
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;
    
    IF p_assistant_name IS NULL OR p_assistant_name = '' THEN
        RAISE EXCEPTION 'Assistant name cannot be null or empty';
    END IF;
    
    IF p_ai_greeting IS NULL OR p_ai_greeting = '' THEN
        RAISE EXCEPTION 'AI greeting cannot be null or empty';
    END IF;
    
    -- Begin atomic transaction
    BEGIN
        -- 1. Update user_settings table
        UPDATE public.user_settings 
        SET 
            assistant_name = trim(p_assistant_name),
            ai_greeting = trim(p_ai_greeting),
            updated_at = NOW()
        WHERE id = p_user_id
        RETURNING * INTO settings_record;
        
        -- Check if user_settings record exists
        IF NOT FOUND THEN
            RAISE EXCEPTION 'User settings not found for user %', p_user_id;
        END IF;
        
        -- 2. Update profiles table only if there are profile changes
        -- Check if any profile fields need updating
        IF p_first_name IS NOT NULL OR p_last_name IS NOT NULL OR p_business_name IS NOT NULL THEN
            -- Calculate full_name if first_name or last_name are provided
            DECLARE
                calculated_full_name TEXT;
            BEGIN
                calculated_full_name := CASE 
                    WHEN p_first_name IS NOT NULL AND p_last_name IS NOT NULL THEN
                        trim(concat(trim(p_first_name), ' ', trim(p_last_name)))
                    WHEN p_first_name IS NOT NULL THEN
                        trim(p_first_name)
                    WHEN p_last_name IS NOT NULL THEN
                        trim(p_last_name)
                    ELSE NULL
                END;
                
                -- Only update non-null fields
                UPDATE public.profiles 
                SET 
                    first_name = CASE WHEN p_first_name IS NOT NULL THEN NULLIF(trim(p_first_name), '') ELSE first_name END,
                    last_name = CASE WHEN p_last_name IS NOT NULL THEN NULLIF(trim(p_last_name), '') ELSE last_name END,
                    full_name = CASE WHEN calculated_full_name IS NOT NULL THEN NULLIF(calculated_full_name, '') ELSE full_name END,
                    business_name = CASE WHEN p_business_name IS NOT NULL THEN NULLIF(trim(p_business_name), '') ELSE business_name END,
                    updated_at = NOW()
                WHERE id = p_user_id
                RETURNING * INTO profile_record;
                
                -- Check if profile record exists
                IF NOT FOUND THEN
                    RAISE EXCEPTION 'User profile not found for user %', p_user_id;
                END IF;
                
                profile_updates_made := TRUE;
            END;
        ELSE
            -- No profile updates needed, but get current profile for response
            SELECT * INTO profile_record FROM public.profiles WHERE id = p_user_id;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'User profile not found for user %', p_user_id;
            END IF;
        END IF;
        
        -- Build result JSON
        result := json_build_object(
            'success', true,
            'user_id', p_user_id,
            'settings', row_to_json(settings_record),
            'profile', row_to_json(profile_record),
            'profile_updated', profile_updates_made
        );
        
        -- Log successful operation
        RAISE NOTICE 'AI settings update completed for user % (profile_updated: %)', p_user_id, profile_updates_made;
        
        RETURN result;
        
    EXCEPTION
        WHEN foreign_key_violation THEN
            RAISE EXCEPTION 'Foreign key constraint violation during AI settings update for user %: %', p_user_id, SQLERRM;
            
        WHEN check_violation THEN
            RAISE EXCEPTION 'Check constraint violation during AI settings update for user %: %', p_user_id, SQLERRM;
            
        WHEN not_null_violation THEN
            RAISE EXCEPTION 'Not null constraint violation during AI settings update for user %: %', p_user_id, SQLERRM;
            
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Unexpected error during AI settings update for user %: % (SQLSTATE: %)', 
                p_user_id, SQLERRM, SQLSTATE;
    END;
END;
$$;


ALTER FUNCTION "public"."update_ai_settings"("p_user_id" "uuid", "p_assistant_name" "text", "p_ai_greeting" "text", "p_first_name" "text", "p_last_name" "text", "p_business_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_ai_settings"("p_user_id" "uuid", "p_assistant_name" "text", "p_ai_greeting" "text", "p_first_name" "text", "p_last_name" "text", "p_business_name" "text") IS 'Atomically updates AI receptionist settings across user_settings and profiles tables within a transaction. Updates assistant_name and ai_greeting in user_settings, and optionally updates first_name, last_name, and business_name in profiles. Returns JSON with success status and updated records.';



CREATE OR REPLACE FUNCTION "public"."user_profile_exists"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
BEGIN
    -- Security check: users can only check their own profile existence
    IF auth.uid() != user_id THEN
        RAISE EXCEPTION 'Access denied: You can only check your own profile existence';
    END IF;
    
    RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id);
END;
$$;


ALTER FUNCTION "public"."user_profile_exists"("user_id" "uuid") OWNER TO "postgres";


CREATE FOREIGN DATA WRAPPER "stripe_wrapper" HANDLER "extensions"."stripe_fdw_handler" VALIDATOR "extensions"."stripe_fdw_validator";




CREATE SERVER "stripe_server" FOREIGN DATA WRAPPER "stripe_wrapper" OPTIONS (
    "api_key_id" 'a5717d06-7c70-40d6-8b4d-2e9d6d63f970'
);


ALTER SERVER "stripe_server" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "full_name" "text",
    "phone" "text",
    "business_name" "text",
    "bio" "text",
    "avatar_url" "text",
    "website" "text",
    "license_number" "text",
    "brokerage" "text",
    "city" "text",
    "state" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_login" timestamp with time zone,
    "stripe_customer_id" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'User profile information including Stripe customer ID for billing';



COMMENT ON COLUMN "public"."profiles"."stripe_customer_id" IS 'Stripe customer ID for billing and subscription management';



CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "id" "uuid" NOT NULL,
    "ai_greeting" "text" DEFAULT 'Hello! Thank you for calling. How can I assist you today?'::"text" NOT NULL,
    "email_notifications" boolean DEFAULT true,
    "sms_notifications" boolean DEFAULT false,
    "billing_notifications" boolean DEFAULT true,
    "marketing_emails" boolean DEFAULT true,
    "theme" "text" DEFAULT 'system'::"text",
    "timezone" "text" DEFAULT 'UTC'::"text",
    "language" "text" DEFAULT 'en'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "assistant_name" "text" DEFAULT 'Ava'::"text" NOT NULL,
    CONSTRAINT "user_settings_theme_check" CHECK (("theme" = ANY (ARRAY['light'::"text", 'dark'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."user_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_settings" IS 'User preferences and notification settings';



CREATE TABLE IF NOT EXISTS "public"."user_subscriptions" (
    "id" "uuid" NOT NULL,
    "plan_type" "text" DEFAULT 'free'::"text",
    "status" "text" DEFAULT 'active'::"text",
    "stripe_subscription_id" "text",
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_subscriptions_plan_type_check" CHECK (("plan_type" = ANY (ARRAY['free'::"text", 'professional'::"text", 'enterprise'::"text"]))),
    CONSTRAINT "user_subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'cancelled'::"text", 'past_due'::"text"]))),
    CONSTRAINT "valid_plan_type" CHECK (("plan_type" = ANY (ARRAY['free'::"text", 'professional'::"text", 'enterprise'::"text"]))),
    CONSTRAINT "valid_subscription_status" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'cancelled'::"text", 'past_due'::"text"])))
);


ALTER TABLE "public"."user_subscriptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_subscriptions" IS 'Local subscription tracking - synced with Stripe via webhooks';



CREATE FOREIGN TABLE "stripe"."customers" (
    "id" "text",
    "email" "text",
    "name" "text",
    "description" "text",
    "created" timestamp without time zone,
    "updated" timestamp without time zone,
    "metadata" "jsonb"
)
SERVER "stripe_server"
OPTIONS (
    "object" 'customers'
);


ALTER FOREIGN TABLE "stripe"."customers" OWNER TO "postgres";


CREATE FOREIGN TABLE "stripe"."invoices" (
    "id" "text",
    "customer" "text",
    "subscription" "text",
    "status" "text",
    "total" bigint,
    "currency" "text",
    "period_start" timestamp without time zone,
    "period_end" timestamp without time zone,
    "created" timestamp without time zone,
    "metadata" "jsonb"
)
SERVER "stripe_server"
OPTIONS (
    "object" 'invoices'
);


ALTER FOREIGN TABLE "stripe"."invoices" OWNER TO "postgres";


CREATE FOREIGN TABLE "stripe"."prices" (
    "id" "text",
    "active" boolean,
    "currency" "text",
    "product" "text",
    "unit_amount" bigint,
    "type" "text",
    "recurring" "jsonb",
    "metadata" "jsonb"
)
SERVER "stripe_server"
OPTIONS (
    "object" 'prices'
);


ALTER FOREIGN TABLE "stripe"."prices" OWNER TO "postgres";


CREATE FOREIGN TABLE "stripe"."products" (
    "id" "text",
    "name" "text",
    "active" boolean,
    "description" "text",
    "metadata" "jsonb",
    "created" timestamp without time zone,
    "updated" timestamp without time zone
)
SERVER "stripe_server"
OPTIONS (
    "object" 'products'
);


ALTER FOREIGN TABLE "stripe"."products" OWNER TO "postgres";


CREATE FOREIGN TABLE "stripe"."subscriptions" (
    "id" "text",
    "customer" "text",
    "status" "text",
    "current_period_start" timestamp without time zone,
    "current_period_end" timestamp without time zone,
    "cancel_at_period_end" boolean,
    "canceled_at" timestamp without time zone,
    "created" timestamp without time zone,
    "trial_start" timestamp without time zone,
    "trial_end" timestamp without time zone,
    "metadata" "jsonb",
    "items" "jsonb",
    "latest_invoice" "jsonb",
    "default_payment_method" "text",
    "collection_method" "text",
    "currency" "text"
)
SERVER "stripe_server"
OPTIONS (
    "object" 'subscriptions',
    "rowid_column" 'id'
);


ALTER FOREIGN TABLE "stripe"."subscriptions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_stripe_customer_id_key" UNIQUE ("stripe_customer_id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



CREATE INDEX "idx_profiles_stripe_customer_id" ON "public"."profiles" USING "btree" ("stripe_customer_id") WHERE ("stripe_customer_id" IS NOT NULL);



CREATE INDEX "idx_user_subscriptions_status_plan" ON "public"."user_subscriptions" USING "btree" ("status", "plan_type");



CREATE INDEX "idx_user_subscriptions_stripe_subscription_id" ON "public"."user_subscriptions" USING "btree" ("stripe_subscription_id") WHERE ("stripe_subscription_id" IS NOT NULL);



CREATE INDEX "idx_user_subscriptions_user_id" ON "public"."user_subscriptions" USING "btree" ("id");



CREATE INDEX "profiles_email_idx" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "profiles_updated_at_idx" ON "public"."profiles" USING "btree" ("updated_at");



CREATE INDEX "user_subscriptions_status_idx" ON "public"."user_subscriptions" USING "btree" ("status");



CREATE OR REPLACE TRIGGER "handle_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_user_settings_updated_at" BEFORE UPDATE ON "public"."user_settings" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_user_subscriptions_updated_at" BEFORE UPDATE ON "public"."user_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_subscriptions"
    ADD CONSTRAINT "user_subscriptions_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Only service role can modify subscriptions" ON "public"."user_subscriptions" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



COMMENT ON POLICY "Only service role can modify subscriptions" ON "public"."user_subscriptions" IS 'Subscription data should only be modified by Stripe webhooks or admin functions';



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert own settings" ON "public"."user_settings" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert own subscription" ON "public"."user_subscriptions" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own settings" ON "public"."user_settings" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own settings" ON "public"."user_settings" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own subscription" ON "public"."user_subscriptions" FOR SELECT USING (("auth"."uid"() = "id"));



COMMENT ON POLICY "Users can view own subscription" ON "public"."user_subscriptions" IS 'Users can only view their own subscription details';



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_subscriptions" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT USAGE ON SCHEMA "stripe" TO "authenticated";














































































































































































































































































GRANT ALL ON FUNCTION "public"."cancel_user_subscription"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_user_subscription"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_user_subscription"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_full_profile"("p_user_id" "uuid", "p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_full_name" "text", "p_phone" "text", "p_avatar_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_full_profile"("p_user_id" "uuid", "p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_full_name" "text", "p_phone" "text", "p_avatar_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_full_profile"("p_user_id" "uuid", "p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_full_name" "text", "p_phone" "text", "p_avatar_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_data"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_data"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_data"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_subscription_details"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_subscription_details"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_subscription_details"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_subscription_status"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_subscription_status"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_subscription_status"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_ai_settings"("p_user_id" "uuid", "p_assistant_name" "text", "p_ai_greeting" "text", "p_first_name" "text", "p_last_name" "text", "p_business_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_ai_settings"("p_user_id" "uuid", "p_assistant_name" "text", "p_ai_greeting" "text", "p_first_name" "text", "p_last_name" "text", "p_business_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_ai_settings"("p_user_id" "uuid", "p_assistant_name" "text", "p_ai_greeting" "text", "p_first_name" "text", "p_last_name" "text", "p_business_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_profile_exists"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_profile_exists"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_profile_exists"("user_id" "uuid") TO "service_role";












GRANT ALL ON FOREIGN SERVER "stripe_server" TO "authenticated";












GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_settings" TO "service_role";



GRANT ALL ON TABLE "public"."user_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."user_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_subscriptions" TO "service_role";



GRANT SELECT ON TABLE "stripe"."customers" TO "authenticated";



GRANT SELECT ON TABLE "stripe"."invoices" TO "authenticated";



GRANT SELECT ON TABLE "stripe"."prices" TO "authenticated";



GRANT SELECT ON TABLE "stripe"."products" TO "authenticated";



GRANT SELECT ON TABLE "stripe"."subscriptions" TO "authenticated";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
