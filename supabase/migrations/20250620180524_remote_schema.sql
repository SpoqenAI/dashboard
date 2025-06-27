create type "public"."phone_provider" as enum ('vapi', 'twilio');

drop trigger if exists "handle_subscriptions_updated_at" on "public"."subscriptions";

drop policy "Users can insert own subscription" on "public"."subscriptions";

drop policy "Users can update own subscription" on "public"."subscriptions";

drop policy "Users can view own subscription" on "public"."subscriptions";

drop function if exists "public"."create_full_profile"(p_user_id uuid, p_email text, p_first_name text, p_last_name text, p_full_name text, p_phone text, p_avatar_url text);

drop index if exists "public"."subscriptions_current_period_start_idx";

drop index if exists "public"."subscriptions_status_idx";

drop index if exists "public"."subscriptions_user_id_idx";

create table "public"."phone_numbers" (
    "id" uuid not null default gen_random_uuid(),
    "assistant_id" uuid,
    "provider" phone_provider default 'vapi'::phone_provider,
    "provider_number_id" text,
    "e164_number" text,
    "status" text default 'active'::text,
    "paused_at" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "released_at" timestamp with time zone
);


alter table "public"."phone_numbers" enable row level security;

alter table "public"."profiles" add column "address_type" text default 'business'::text;

alter table "public"."profiles" add column "country" text default 'United States'::text;

alter table "public"."profiles" add column "formatted_address" text;

alter table "public"."profiles" add column "paddle_customer_id" text;

alter table "public"."profiles" add column "postal_code" text;

alter table "public"."profiles" add column "street_address" text;

alter table "public"."subscriptions" drop column "created_at";

alter table "public"."subscriptions" drop column "updated_at";

alter table "public"."subscriptions" disable row level security;

CREATE UNIQUE INDEX idx_phone_numbers_provider_id ON public.phone_numbers USING btree (provider, provider_number_id);

CREATE INDEX idx_phone_numbers_status ON public.phone_numbers USING btree (status);

CREATE INDEX idx_profiles_city_state ON public.profiles USING btree (city, state) WHERE ((city IS NOT NULL) AND (state IS NOT NULL));

CREATE INDEX idx_profiles_postal_code ON public.profiles USING btree (postal_code) WHERE (postal_code IS NOT NULL);

CREATE UNIQUE INDEX phone_numbers_e164_number_key ON public.phone_numbers USING btree (e164_number);

CREATE UNIQUE INDEX phone_numbers_pkey ON public.phone_numbers USING btree (id);

alter table "public"."phone_numbers" add constraint "phone_numbers_pkey" PRIMARY KEY using index "phone_numbers_pkey";

alter table "public"."phone_numbers" add constraint "phone_numbers_assistant_id_fkey" FOREIGN KEY (assistant_id) REFERENCES assistants(id) ON DELETE CASCADE not valid;

alter table "public"."phone_numbers" validate constraint "phone_numbers_assistant_id_fkey";

alter table "public"."phone_numbers" add constraint "phone_numbers_e164_number_key" UNIQUE using index "phone_numbers_e164_number_key";

alter table "public"."phone_numbers" add constraint "phone_numbers_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'released'::text]))) not valid;

alter table "public"."phone_numbers" validate constraint "phone_numbers_status_check";

alter table "public"."profiles" add constraint "profiles_address_type_check" CHECK ((address_type = ANY (ARRAY['business'::text, 'home'::text, 'other'::text]))) not valid;

alter table "public"."profiles" validate constraint "profiles_address_type_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_full_profile(p_user_id uuid, p_email text, p_first_name text DEFAULT NULL::text, p_last_name text DEFAULT NULL::text, p_full_name text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_avatar_url text DEFAULT NULL::text, p_street_address text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_state text DEFAULT NULL::text, p_postal_code text DEFAULT NULL::text, p_country text DEFAULT 'United States'::text, p_formatted_address text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    result JSON;
    profile_record RECORD;
    settings_record RECORD;
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
        -- 1. Upsert profile record with address fields (no coordinates)
        INSERT INTO public.profiles (
            id,
            email,
            first_name,
            last_name,
            full_name,
            phone,
            avatar_url,
            street_address,
            city,
            state,
            postal_code,
            country,
            formatted_address,
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
            NULLIF(trim(p_street_address), ''),
            NULLIF(trim(p_city), ''),
            NULLIF(trim(p_state), ''),
            NULLIF(trim(p_postal_code), ''),
            NULLIF(trim(p_country), ''),
            NULLIF(trim(p_formatted_address), ''),
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
            street_address = COALESCE(EXCLUDED.street_address, profiles.street_address),
            city = COALESCE(EXCLUDED.city, profiles.city),
            state = COALESCE(EXCLUDED.state, profiles.state),
            postal_code = COALESCE(EXCLUDED.postal_code, profiles.postal_code),
            country = COALESCE(EXCLUDED.country, profiles.country),
            formatted_address = COALESCE(EXCLUDED.formatted_address, profiles.formatted_address),
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
        
        -- Build result JSON
        result := json_build_object(
            'success', true,
            'user_id', p_user_id,
            'profile', row_to_json(profile_record),
            'settings', row_to_json(settings_record)
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
$function$
;

CREATE OR REPLACE FUNCTION public.create_full_profile(p_user_id uuid, p_email text, p_first_name text DEFAULT NULL::text, p_last_name text DEFAULT NULL::text, p_full_name text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_avatar_url text DEFAULT NULL::text, p_street_address text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_state text DEFAULT NULL::text, p_postal_code text DEFAULT NULL::text, p_country text DEFAULT 'United States'::text, p_latitude numeric DEFAULT NULL::numeric, p_longitude numeric DEFAULT NULL::numeric, p_formatted_address text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    result JSON;
    profile_record RECORD;
    settings_record RECORD;
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
        -- 1. Upsert profile record with new address fields
        INSERT INTO public.profiles (
            id,
            email,
            first_name,
            last_name,
            full_name,
            phone,
            avatar_url,
            street_address,
            city,
            state,
            postal_code,
            country,
            latitude,
            longitude,
            formatted_address,
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
            NULLIF(trim(p_street_address), ''),
            NULLIF(trim(p_city), ''),
            NULLIF(trim(p_state), ''),
            NULLIF(trim(p_postal_code), ''),
            NULLIF(trim(p_country), ''),
            p_latitude,
            p_longitude,
            NULLIF(trim(p_formatted_address), ''),
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
            street_address = COALESCE(EXCLUDED.street_address, profiles.street_address),
            city = COALESCE(EXCLUDED.city, profiles.city),
            state = COALESCE(EXCLUDED.state, profiles.state),
            postal_code = COALESCE(EXCLUDED.postal_code, profiles.postal_code),
            country = COALESCE(EXCLUDED.country, profiles.country),
            latitude = COALESCE(EXCLUDED.latitude, profiles.latitude),
            longitude = COALESCE(EXCLUDED.longitude, profiles.longitude),
            formatted_address = COALESCE(EXCLUDED.formatted_address, profiles.formatted_address),
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
        
        -- Build result JSON
        result := json_build_object(
            'success', true,
            'user_id', p_user_id,
            'profile', row_to_json(profile_record),
            'settings', row_to_json(settings_record)
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
$function$
;

CREATE OR REPLACE FUNCTION public.cancel_user_subscription(user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.create_full_profile(p_user_id uuid, p_email text, p_first_name text DEFAULT NULL::text, p_last_name text DEFAULT NULL::text, p_full_name text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_avatar_url text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_data(user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_subscription_details(user_id uuid)
 RETURNS TABLE(has_active_subscription boolean, plan_type text, subscription_status text, current_period_start timestamp with time zone, current_period_end timestamp with time zone, cancel_at_period_end boolean, stripe_subscription_id text, stripe_customer_id text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_subscription_status(user_id uuid)
 RETURNS TABLE(is_subscribed boolean, plan_type text, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
        
        -- Note: Removed user_subscriptions insert since that table doesn't exist
        -- Subscriptions will be created via Paddle webhooks in the 'subscriptions' table
        
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
$function$
;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_ai_settings(p_user_id uuid, p_assistant_name text, p_ai_greeting text, p_first_name text DEFAULT NULL::text, p_last_name text DEFAULT NULL::text, p_business_name text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.user_profile_exists(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
    -- Security check: users can only check their own profile existence
    IF auth.uid() != user_id THEN
        RAISE EXCEPTION 'Access denied: You can only check your own profile existence';
    END IF;
    
    RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id);
END;
$function$
;

grant delete on table "public"."phone_numbers" to "anon";

grant insert on table "public"."phone_numbers" to "anon";

grant references on table "public"."phone_numbers" to "anon";

grant select on table "public"."phone_numbers" to "anon";

grant trigger on table "public"."phone_numbers" to "anon";

grant truncate on table "public"."phone_numbers" to "anon";

grant update on table "public"."phone_numbers" to "anon";

grant delete on table "public"."phone_numbers" to "authenticated";

grant insert on table "public"."phone_numbers" to "authenticated";

grant references on table "public"."phone_numbers" to "authenticated";

grant select on table "public"."phone_numbers" to "authenticated";

grant trigger on table "public"."phone_numbers" to "authenticated";

grant truncate on table "public"."phone_numbers" to "authenticated";

grant update on table "public"."phone_numbers" to "authenticated";

grant delete on table "public"."phone_numbers" to "service_role";

grant insert on table "public"."phone_numbers" to "service_role";

grant references on table "public"."phone_numbers" to "service_role";

grant select on table "public"."phone_numbers" to "service_role";

grant trigger on table "public"."phone_numbers" to "service_role";

grant truncate on table "public"."phone_numbers" to "service_role";

grant update on table "public"."phone_numbers" to "service_role";

create policy "phone_owner"
on "public"."phone_numbers"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM assistants a
  WHERE ((a.id = phone_numbers.assistant_id) AND (a.user_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM assistants a
  WHERE ((a.id = phone_numbers.assistant_id) AND (a.user_id = auth.uid())))));



