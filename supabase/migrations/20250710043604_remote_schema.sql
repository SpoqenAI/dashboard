create extension if not exists "wrappers" with schema "extensions";


create type "public"."assistant_status" as enum ('draft', 'active', 'inactive', 'provisioning', 'error');

create type "public"."phone_provider" as enum ('vapi', 'twilio');

create table "public"."call_analysis" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "vapi_call_id" text not null,
    "call_purpose" text,
    "sentiment" text,
    "lead_quality" text,
    "key_points" text[],
    "follow_up_items" text[],
    "urgent_concerns" text[],
    "property_interest" text,
    "timeline" text,
    "contact_preference" text,
    "appointment_requested" boolean default false,
    "analyzed_at" timestamp with time zone default now(),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."call_analysis" enable row level security;

create table "public"."pending_vapi_provision" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "email" text not null,
    "created_at" timestamp with time zone not null default now(),
    "processed_at" timestamp with time zone,
    "error" text
);


create table "public"."phone_numbers" (
    "id" uuid not null default gen_random_uuid(),
    "provider" phone_provider default 'vapi'::phone_provider,
    "provider_number_id" text,
    "e164_number" text,
    "status" text default 'active'::text,
    "paused_at" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "released_at" timestamp with time zone,
    "user_id" uuid not null
);


alter table "public"."phone_numbers" enable row level security;

create table "public"."profiles" (
    "id" uuid not null,
    "email" text not null,
    "first_name" text,
    "last_name" text,
    "full_name" text,
    "phone" text,
    "business_name" text,
    "avatar_url" text,
    "website" text,
    "license_number" text,
    "brokerage" text,
    "city" text,
    "state" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "last_login" timestamp with time zone,
    "bio" text,
    "street_address" text,
    "postal_code" text,
    "country" text default 'United States'::text,
    "formatted_address" text,
    "address_type" text default 'business'::text,
    "onboarding_completed_at" timestamp with time zone
);


alter table "public"."profiles" enable row level security;

create table "public"."subscriptions" (
    "id" text not null,
    "user_id" uuid not null,
    "status" text,
    "price_id" text,
    "quantity" integer,
    "cancel_at_period_end" boolean,
    "current_period_start_at" timestamp with time zone,
    "current_period_end_at" timestamp with time zone,
    "ended_at" timestamp with time zone,
    "cancel_at" timestamp with time zone,
    "canceled_at" timestamp with time zone,
    "trial_start_at" timestamp with time zone,
    "trial_end_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "paddle_customer_id" text
);


create table "public"."user_settings" (
    "id" uuid not null,
    "email_notifications" boolean default true,
    "billing_notifications" boolean default true,
    "marketing_emails" boolean default true,
    "theme" text default 'system'::text,
    "timezone" text default 'UTC'::text,
    "language" text default 'en'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "assistant_provisioning_status" text,
    "assistant_provisioning_started_at" timestamp with time zone,
    "assistant_provisioning_completed_at" timestamp with time zone,
    "vapi_assistant_id" text
);


alter table "public"."user_settings" enable row level security;

CREATE UNIQUE INDEX call_analysis_pkey ON public.call_analysis USING btree (id);

CREATE UNIQUE INDEX call_analysis_vapi_call_id_key ON public.call_analysis USING btree (vapi_call_id);

CREATE INDEX idx_call_analysis_analyzed_at ON public.call_analysis USING btree (analyzed_at);

CREATE INDEX idx_call_analysis_lead_quality ON public.call_analysis USING btree (lead_quality);

CREATE INDEX idx_call_analysis_sentiment ON public.call_analysis USING btree (sentiment);

CREATE INDEX idx_call_analysis_user_id ON public.call_analysis USING btree (user_id);

CREATE INDEX idx_call_analysis_vapi_call_id ON public.call_analysis USING btree (vapi_call_id);

CREATE UNIQUE INDEX idx_phone_numbers_provider_id ON public.phone_numbers USING btree (provider, provider_number_id);

CREATE INDEX idx_phone_numbers_status ON public.phone_numbers USING btree (status);

CREATE INDEX idx_profiles_city_state ON public.profiles USING btree (city, state) WHERE ((city IS NOT NULL) AND (state IS NOT NULL));

CREATE INDEX idx_profiles_onboarding_completed ON public.profiles USING btree (onboarding_completed_at) WHERE (onboarding_completed_at IS NOT NULL);

CREATE INDEX idx_profiles_postal_code ON public.profiles USING btree (postal_code) WHERE (postal_code IS NOT NULL);

CREATE INDEX idx_user_settings_provisioning_status ON public.user_settings USING btree (assistant_provisioning_status) WHERE (assistant_provisioning_status IS NOT NULL);

CREATE UNIQUE INDEX pending_vapi_provision_pkey ON public.pending_vapi_provision USING btree (id);

CREATE UNIQUE INDEX phone_numbers_e164_number_key ON public.phone_numbers USING btree (e164_number);

CREATE UNIQUE INDEX phone_numbers_pkey ON public.phone_numbers USING btree (id);

CREATE UNIQUE INDEX phone_numbers_user_id_key ON public.phone_numbers USING btree (user_id);

CREATE INDEX profiles_email_idx ON public.profiles USING btree (email);

CREATE UNIQUE INDEX profiles_email_key ON public.profiles USING btree (email);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE INDEX profiles_updated_at_idx ON public.profiles USING btree (updated_at);

CREATE INDEX subscriptions_paddle_customer_id_idx ON public.subscriptions USING btree (paddle_customer_id);

CREATE UNIQUE INDEX subscriptions_pkey ON public.subscriptions USING btree (id);

CREATE UNIQUE INDEX subscriptions_user_id_key ON public.subscriptions USING btree (user_id);

CREATE UNIQUE INDEX user_settings_pkey ON public.user_settings USING btree (id);

CREATE UNIQUE INDEX user_settings_vapi_assistant_id_key ON public.user_settings USING btree (vapi_assistant_id);

alter table "public"."call_analysis" add constraint "call_analysis_pkey" PRIMARY KEY using index "call_analysis_pkey";

alter table "public"."pending_vapi_provision" add constraint "pending_vapi_provision_pkey" PRIMARY KEY using index "pending_vapi_provision_pkey";

alter table "public"."phone_numbers" add constraint "phone_numbers_pkey" PRIMARY KEY using index "phone_numbers_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."subscriptions" add constraint "subscriptions_pkey" PRIMARY KEY using index "subscriptions_pkey";

alter table "public"."user_settings" add constraint "user_settings_pkey" PRIMARY KEY using index "user_settings_pkey";

alter table "public"."call_analysis" add constraint "call_analysis_lead_quality_check" CHECK ((lead_quality = ANY (ARRAY['hot'::text, 'warm'::text, 'cold'::text]))) not valid;

alter table "public"."call_analysis" validate constraint "call_analysis_lead_quality_check";

alter table "public"."call_analysis" add constraint "call_analysis_sentiment_check" CHECK ((sentiment = ANY (ARRAY['positive'::text, 'negative'::text, 'neutral'::text]))) not valid;

alter table "public"."call_analysis" validate constraint "call_analysis_sentiment_check";

alter table "public"."call_analysis" add constraint "call_analysis_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."call_analysis" validate constraint "call_analysis_user_id_fkey";

alter table "public"."call_analysis" add constraint "call_analysis_vapi_call_id_key" UNIQUE using index "call_analysis_vapi_call_id_key";

alter table "public"."pending_vapi_provision" add constraint "pending_vapi_provision_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."pending_vapi_provision" validate constraint "pending_vapi_provision_user_id_fkey";

alter table "public"."phone_numbers" add constraint "phone_numbers_e164_number_key" UNIQUE using index "phone_numbers_e164_number_key";

alter table "public"."phone_numbers" add constraint "phone_numbers_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'released'::text]))) not valid;

alter table "public"."phone_numbers" validate constraint "phone_numbers_status_check";

alter table "public"."phone_numbers" add constraint "phone_numbers_user_id_key" UNIQUE using index "phone_numbers_user_id_key";

alter table "public"."profiles" add constraint "profiles_address_type_check" CHECK ((address_type = ANY (ARRAY['business'::text, 'home'::text, 'other'::text]))) not valid;

alter table "public"."profiles" validate constraint "profiles_address_type_check";

alter table "public"."profiles" add constraint "profiles_email_key" UNIQUE using index "profiles_email_key";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."subscriptions" add constraint "subscriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_user_id_fkey";

alter table "public"."subscriptions" add constraint "subscriptions_user_id_key" UNIQUE using index "subscriptions_user_id_key";

alter table "public"."user_settings" add constraint "user_settings_assistant_provisioning_status_check" CHECK ((assistant_provisioning_status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text]))) not valid;

alter table "public"."user_settings" validate constraint "user_settings_assistant_provisioning_status_check";

alter table "public"."user_settings" add constraint "user_settings_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_settings" validate constraint "user_settings_id_fkey";

alter table "public"."user_settings" add constraint "user_settings_theme_check" CHECK ((theme = ANY (ARRAY['light'::text, 'dark'::text, 'system'::text]))) not valid;

alter table "public"."user_settings" validate constraint "user_settings_theme_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_full_profile(p_user_id uuid, p_email text, p_first_name text DEFAULT NULL::text, p_last_name text DEFAULT NULL::text, p_full_name text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    result JSON;
    profile_record RECORD;
    settings_record RECORD;
    current_user_id UUID;
BEGIN
    -- Get the current authenticated user ID
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Access denied: No authenticated user session';
    END IF;
    IF current_user_id != p_user_id THEN
        RAISE EXCEPTION 'Access denied: You can only create/modify your own profile (user: %, requested: %)', current_user_id, p_user_id;
    END IF;
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;
    IF p_email IS NULL OR p_email = '' THEN
        RAISE EXCEPTION 'User email cannot be null or empty';
    END IF;
    IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format: %', p_email;
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
            last_login,
            updated_at
        ) VALUES (
            p_user_id,
            p_email,
            NULLIF(trim(p_first_name), ''),
            NULLIF(trim(p_last_name), ''),
            NULLIF(trim(p_full_name), ''),
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
            last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
            full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
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
            RAISE EXCEPTION 'Unexpected error during profile creation for user %: % (SQLSTATE: %)', p_user_id, SQLERRM, SQLSTATE;
    END;
END;
$function$
;

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
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Access denied: No authenticated user session';
    END IF;
    IF current_user_id != p_user_id THEN
        RAISE EXCEPTION 'Access denied: You can only create/modify your own profile (user: %, requested: %)', current_user_id, p_user_id;
    END IF;
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;
    IF p_email IS NULL OR p_email = '' THEN
        RAISE EXCEPTION 'User email cannot be null or empty';
    END IF;
    IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format: %', p_email;
    END IF;
    IF p_phone IS NOT NULL AND p_phone != '' THEN
        IF p_phone !~ '^[\+]?[0-9\(\)\-\s\.]{10,}$' THEN
            RAISE EXCEPTION 'Invalid phone number format: %', p_phone;
        END IF;
    END IF;
    IF p_avatar_url IS NOT NULL AND p_avatar_url != '' THEN
        IF p_avatar_url !~ '^https?://.*' THEN
            RAISE EXCEPTION 'Invalid avatar URL format: %', p_avatar_url;
        END IF;
    END IF;
    BEGIN
        INSERT INTO public.profiles (
            id, email, first_name, last_name, full_name, phone, avatar_url, street_address, city, state, postal_code, country, formatted_address, last_login, updated_at
        ) VALUES (
            p_user_id, p_email, NULLIF(trim(p_first_name), ''), NULLIF(trim(p_last_name), ''), NULLIF(trim(p_full_name), ''), NULLIF(trim(p_phone), ''), NULLIF(trim(p_avatar_url), ''), NULLIF(trim(p_street_address), ''), NULLIF(trim(p_city), ''), NULLIF(trim(p_state), ''), NULLIF(trim(p_postal_code), ''), NULLIF(trim(p_country), ''), NULLIF(trim(p_formatted_address), ''), NOW(), NOW()
        ) ON CONFLICT (id) DO UPDATE SET
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
        INSERT INTO public.user_settings (
            id, updated_at
        ) VALUES (
            p_user_id, NOW()
        ) ON CONFLICT (id) DO UPDATE SET
            updated_at = NOW()
        RETURNING * INTO settings_record;
        result := json_build_object(
            'success', true,
            'user_id', p_user_id,
            'profile', row_to_json(profile_record),
            'settings', row_to_json(settings_record)
        );
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
            RAISE EXCEPTION 'Unexpected error during profile creation for user %: % (SQLSTATE: %)', p_user_id, SQLERRM, SQLSTATE;
    END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_email_verified()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  vapi_id TEXT;
  api_url TEXT := 'https://spoqen.com/api/vapi/assistant/auto-create';
  http_response JSON;
BEGIN
  RAISE NOTICE 'handle_email_verified trigger fired for user %', NEW.id;
  IF (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL) THEN
    BEGIN
      -- Check if user already has a vapi_assistant_id
      SELECT vapi_assistant_id INTO vapi_id FROM public.user_settings WHERE id = NEW.id;
      IF vapi_id IS NULL THEN
        -- Call backend endpoint to create assistant (idempotent)
        http_response := (
          SELECT content::json FROM http (
            api_url,
            'POST',
            'application/json',
            json_build_object('user_id', NEW.id, 'email', NEW.email),
            ARRAY[ROW('x-supabase-secret', current_setting('vault.supabase_trigger_secret'))::http_header]
          )
        );
        RAISE NOTICE 'Assistant creation response: %', http_response;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error in assistant creation: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_email_verified_for_vapi()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Only insert if email_confirmed_at is being set (was NULL, now NOT NULL)
    IF (TG_OP = 'UPDATE' AND NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL) THEN
        INSERT INTO public.pending_vapi_provision (user_id, email)
        VALUES (NEW.id, NEW.email);
    END IF;
    RETURN NEW;
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
AS $function$
BEGIN
  NEW.updated_at = now();
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
    v_email text;
BEGIN
    -- Validation
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;
    IF p_assistant_name IS NULL OR p_assistant_name = '' THEN
        RAISE EXCEPTION 'Assistant name cannot be null or empty';
    END IF;
    IF p_ai_greeting IS NULL OR p_ai_greeting = '' THEN
        RAISE EXCEPTION 'AI greeting cannot be null or empty';
    END IF;

    -- Ensure user_settings exists
    INSERT INTO public.user_settings (id)
        VALUES (p_user_id)
        ON CONFLICT (id) DO NOTHING;

    -- Ensure profiles row exists (email NOT NULL)
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
        SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
        IF v_email IS NULL THEN
            RAISE EXCEPTION 'Cannot create profile: user email not found';
        END IF;
        INSERT INTO public.profiles (id, email)
            VALUES (p_user_id, v_email);
    END IF;

    -- Update user_settings
    UPDATE public.user_settings
    SET assistant_name = trim(p_assistant_name),
        ai_greeting    = trim(p_ai_greeting),
        updated_at     = NOW()
    WHERE id = p_user_id
    RETURNING * INTO settings_record;

    -- Update profiles conditionally
    IF p_first_name IS NOT NULL OR p_last_name IS NOT NULL OR p_business_name IS NOT NULL THEN
        UPDATE public.profiles
        SET first_name    = COALESCE(NULLIF(trim(p_first_name), ''), first_name),
            last_name     = COALESCE(NULLIF(trim(p_last_name), ''), last_name),
            full_name     = COALESCE(NULLIF(trim(
                                COALESCE(trim(p_first_name)||' ', '') || COALESCE(trim(p_last_name), '')
                              ), ''), full_name),
            business_name = COALESCE(NULLIF(trim(p_business_name), ''), business_name),
            updated_at    = NOW()
        WHERE id = p_user_id
        RETURNING * INTO profile_record;
        profile_updates_made := TRUE;
    ELSE
        SELECT * INTO profile_record FROM public.profiles WHERE id = p_user_id;
    END IF;

    result := json_build_object(
        'success', true,
        'user_id', p_user_id,
        'settings', row_to_json(settings_record),
        'profile', row_to_json(profile_record),
        'profile_updated', profile_updates_made
    );
    RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_call_analysis_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.upsert_subscription(p_subscription_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  result_record subscriptions%ROWTYPE;
  conflict_occurred boolean := false;
BEGIN
  -- Validate required fields
  IF p_subscription_data->>'id' IS NULL OR p_subscription_data->>'user_id' IS NULL THEN
    RAISE EXCEPTION 'Missing required fields: id and user_id are mandatory';
  END IF;

  -- Attempt to insert the subscription
  BEGIN
    INSERT INTO public.subscriptions (
      id,
      user_id,
      status,
      price_id,
      quantity,
      cancel_at_period_end,
      current_period_start_at,
      current_period_end_at,
      ended_at,
      cancel_at,
      canceled_at,
      trial_start_at,
      trial_end_at,
      paddle_customer_id,
      created_at,
      updated_at
    ) VALUES (
      (p_subscription_data->>'id')::text,
      (p_subscription_data->>'user_id')::uuid,
      (p_subscription_data->>'status')::text,
      (p_subscription_data->>'price_id')::text,
      (p_subscription_data->>'quantity')::integer,
      COALESCE((p_subscription_data->>'cancel_at_period_end')::boolean, false),
      (p_subscription_data->>'current_period_start_at')::timestamptz,
      (p_subscription_data->>'current_period_end_at')::timestamptz,
      (p_subscription_data->>'ended_at')::timestamptz,
      (p_subscription_data->>'cancel_at')::timestamptz,
      (p_subscription_data->>'canceled_at')::timestamptz,
      (p_subscription_data->>'trial_start_at')::timestamptz,
      (p_subscription_data->>'trial_end_at')::timestamptz,
      (p_subscription_data->>'paddle_customer_id')::text,
      COALESCE((p_subscription_data->>'created_at')::timestamptz, NOW()),
      COALESCE((p_subscription_data->>'updated_at')::timestamptz, NOW())
    ) RETURNING * INTO result_record;
    
  EXCEPTION WHEN unique_violation THEN
    -- Handle the case where a subscription already exists for this user
    conflict_occurred := true;
    
    -- Update the existing subscription with new data
    UPDATE public.subscriptions SET
      id = (p_subscription_data->>'id')::text,
      status = COALESCE((p_subscription_data->>'status')::text, status),
      price_id = COALESCE((p_subscription_data->>'price_id')::text, price_id),
      quantity = COALESCE((p_subscription_data->>'quantity')::integer, quantity),
      cancel_at_period_end = COALESCE((p_subscription_data->>'cancel_at_period_end')::boolean, cancel_at_period_end),
      current_period_start_at = COALESCE((p_subscription_data->>'current_period_start_at')::timestamptz, current_period_start_at),
      current_period_end_at = COALESCE((p_subscription_data->>'current_period_end_at')::timestamptz, current_period_end_at),
      ended_at = COALESCE((p_subscription_data->>'ended_at')::timestamptz, ended_at),
      cancel_at = COALESCE((p_subscription_data->>'cancel_at')::timestamptz, cancel_at),
      canceled_at = COALESCE((p_subscription_data->>'canceled_at')::timestamptz, canceled_at),
      trial_start_at = COALESCE((p_subscription_data->>'trial_start_at')::timestamptz, trial_start_at),
      trial_end_at = COALESCE((p_subscription_data->>'trial_end_at')::timestamptz, trial_end_at),
      paddle_customer_id = COALESCE((p_subscription_data->>'paddle_customer_id')::text, paddle_customer_id),
      updated_at = NOW()
    WHERE user_id = (p_subscription_data->>'user_id')::uuid
    RETURNING * INTO result_record;
  END;

  -- Return the result with operation metadata
  RETURN jsonb_build_object(
    'success', true,
    'operation', CASE WHEN conflict_occurred THEN 'updated' ELSE 'inserted' END,
    'subscription', row_to_json(result_record)
  );

EXCEPTION WHEN OTHERS THEN
  -- Return error information
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'error_code', SQLSTATE
  );
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

grant delete on table "public"."call_analysis" to "anon";

grant insert on table "public"."call_analysis" to "anon";

grant references on table "public"."call_analysis" to "anon";

grant select on table "public"."call_analysis" to "anon";

grant trigger on table "public"."call_analysis" to "anon";

grant truncate on table "public"."call_analysis" to "anon";

grant update on table "public"."call_analysis" to "anon";

grant delete on table "public"."call_analysis" to "authenticated";

grant insert on table "public"."call_analysis" to "authenticated";

grant references on table "public"."call_analysis" to "authenticated";

grant select on table "public"."call_analysis" to "authenticated";

grant trigger on table "public"."call_analysis" to "authenticated";

grant truncate on table "public"."call_analysis" to "authenticated";

grant update on table "public"."call_analysis" to "authenticated";

grant delete on table "public"."call_analysis" to "service_role";

grant insert on table "public"."call_analysis" to "service_role";

grant references on table "public"."call_analysis" to "service_role";

grant select on table "public"."call_analysis" to "service_role";

grant trigger on table "public"."call_analysis" to "service_role";

grant truncate on table "public"."call_analysis" to "service_role";

grant update on table "public"."call_analysis" to "service_role";

grant delete on table "public"."pending_vapi_provision" to "anon";

grant insert on table "public"."pending_vapi_provision" to "anon";

grant references on table "public"."pending_vapi_provision" to "anon";

grant select on table "public"."pending_vapi_provision" to "anon";

grant trigger on table "public"."pending_vapi_provision" to "anon";

grant truncate on table "public"."pending_vapi_provision" to "anon";

grant update on table "public"."pending_vapi_provision" to "anon";

grant delete on table "public"."pending_vapi_provision" to "authenticated";

grant insert on table "public"."pending_vapi_provision" to "authenticated";

grant references on table "public"."pending_vapi_provision" to "authenticated";

grant select on table "public"."pending_vapi_provision" to "authenticated";

grant trigger on table "public"."pending_vapi_provision" to "authenticated";

grant truncate on table "public"."pending_vapi_provision" to "authenticated";

grant update on table "public"."pending_vapi_provision" to "authenticated";

grant delete on table "public"."pending_vapi_provision" to "service_role";

grant insert on table "public"."pending_vapi_provision" to "service_role";

grant references on table "public"."pending_vapi_provision" to "service_role";

grant select on table "public"."pending_vapi_provision" to "service_role";

grant trigger on table "public"."pending_vapi_provision" to "service_role";

grant truncate on table "public"."pending_vapi_provision" to "service_role";

grant update on table "public"."pending_vapi_provision" to "service_role";

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

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."subscriptions" to "anon";

grant insert on table "public"."subscriptions" to "anon";

grant references on table "public"."subscriptions" to "anon";

grant select on table "public"."subscriptions" to "anon";

grant trigger on table "public"."subscriptions" to "anon";

grant truncate on table "public"."subscriptions" to "anon";

grant update on table "public"."subscriptions" to "anon";

grant delete on table "public"."subscriptions" to "authenticated";

grant insert on table "public"."subscriptions" to "authenticated";

grant references on table "public"."subscriptions" to "authenticated";

grant select on table "public"."subscriptions" to "authenticated";

grant trigger on table "public"."subscriptions" to "authenticated";

grant truncate on table "public"."subscriptions" to "authenticated";

grant update on table "public"."subscriptions" to "authenticated";

grant delete on table "public"."subscriptions" to "service_role";

grant insert on table "public"."subscriptions" to "service_role";

grant references on table "public"."subscriptions" to "service_role";

grant select on table "public"."subscriptions" to "service_role";

grant trigger on table "public"."subscriptions" to "service_role";

grant truncate on table "public"."subscriptions" to "service_role";

grant update on table "public"."subscriptions" to "service_role";

grant delete on table "public"."user_settings" to "anon";

grant insert on table "public"."user_settings" to "anon";

grant references on table "public"."user_settings" to "anon";

grant select on table "public"."user_settings" to "anon";

grant trigger on table "public"."user_settings" to "anon";

grant truncate on table "public"."user_settings" to "anon";

grant update on table "public"."user_settings" to "anon";

grant delete on table "public"."user_settings" to "authenticated";

grant insert on table "public"."user_settings" to "authenticated";

grant references on table "public"."user_settings" to "authenticated";

grant select on table "public"."user_settings" to "authenticated";

grant trigger on table "public"."user_settings" to "authenticated";

grant truncate on table "public"."user_settings" to "authenticated";

grant update on table "public"."user_settings" to "authenticated";

grant delete on table "public"."user_settings" to "service_role";

grant insert on table "public"."user_settings" to "service_role";

grant references on table "public"."user_settings" to "service_role";

grant select on table "public"."user_settings" to "service_role";

grant trigger on table "public"."user_settings" to "service_role";

grant truncate on table "public"."user_settings" to "service_role";

grant update on table "public"."user_settings" to "service_role";

create policy "Users can insert their own call analysis"
on "public"."call_analysis"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can update their own call analysis"
on "public"."call_analysis"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can view their own call analysis"
on "public"."call_analysis"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "phone_owner"
on "public"."phone_numbers"
as permissive
for all
to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));


create policy "Users can insert own profile"
on "public"."profiles"
as permissive
for insert
to public
with check ((auth.uid() = id));


create policy "Users can update own profile"
on "public"."profiles"
as permissive
for update
to public
using ((auth.uid() = id));


create policy "Users can view own profile"
on "public"."profiles"
as permissive
for select
to public
using ((auth.uid() = id));


create policy "Users can insert own settings"
on "public"."user_settings"
as permissive
for insert
to public
with check ((auth.uid() = id));


create policy "Users can update own settings"
on "public"."user_settings"
as permissive
for update
to public
using ((auth.uid() = id));


create policy "Users can view own settings"
on "public"."user_settings"
as permissive
for select
to public
using ((auth.uid() = id));


CREATE TRIGGER update_call_analysis_updated_at BEFORE UPDATE ON public.call_analysis FOR EACH ROW EXECUTE FUNCTION update_call_analysis_updated_at();

CREATE TRIGGER vapi_assistant_provision AFTER INSERT ON public.pending_vapi_provision FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://vjsmwwuozuiwjprldpjx.functions.supabase.co/vapi-assistant-provision', 'POST', '{"x-webhook-secret":"daf5ee537ec8c96c3e82c1dfa5d2a5a53c896e9240e1f6c31539bb998be5bde6"}', '{}', '5000');

CREATE TRIGGER handle_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION handle_updated_at();


