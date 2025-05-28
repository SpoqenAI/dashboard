-- =====================================================
-- Spoqen Dashboard Database Schema
-- =====================================================
-- This file contains the complete database schema for the Spoqen Dashboard
-- Run these commands in your Supabase SQL editor to set up the required tables

-- =====================================================
-- 1. PROFILES TABLE
-- =====================================================
-- Stores user profile information
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    phone TEXT,
    business_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    website TEXT,
    license_number TEXT,
    brokerage TEXT,
    city TEXT,
    state TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_login TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles table
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
CREATE INDEX IF NOT EXISTS profiles_updated_at_idx ON public.profiles(updated_at);

-- =====================================================
-- 2. USER SETTINGS TABLE
-- =====================================================
-- Stores user preferences and AI settings
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    ai_greeting TEXT DEFAULT 'Hello! Thank you for calling. How can I assist you today?',
    assistant_name TEXT DEFAULT 'Ava',
    business_hours TEXT DEFAULT 'Monday-Friday 9AM-6PM',
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    billing_notifications BOOLEAN DEFAULT TRUE,
    marketing_emails BOOLEAN DEFAULT TRUE,
    theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    timezone TEXT DEFAULT 'UTC',
    language TEXT DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user_settings table
CREATE POLICY "Users can view own settings" ON public.user_settings
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own settings" ON public.user_settings
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own settings" ON public.user_settings
    FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================================================
-- 3. USER SUBSCRIPTIONS TABLE
-- =====================================================
-- Stores subscription and billing information
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'professional', 'enterprise')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled', 'past_due')),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for user_subscriptions table
CREATE POLICY "Users can view own subscription" ON public.user_subscriptions
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own subscription" ON public.user_subscriptions
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own subscription" ON public.user_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS user_subscriptions_stripe_customer_idx ON public.user_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS user_subscriptions_status_idx ON public.user_subscriptions(status);

-- =====================================================
-- 4. FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER handle_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_user_subscriptions_updated_at
    BEFORE UPDATE ON public.user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 5. AUTOMATIC PROFILE CREATION TRIGGER (OPTIONAL)
-- =====================================================
-- This trigger automatically creates profile records when a user signs up
-- Note: This is optional as the application handles profile creation
-- You can enable this for additional safety

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
$$ LANGUAGE plpgsql;

-- Create the trigger (uncomment to enable automatic profile creation)
-- CREATE TRIGGER on_auth_user_created
--     AFTER INSERT ON auth.users
--     FOR EACH ROW
--     EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 6. UTILITY FUNCTIONS
-- =====================================================

-- Function to get complete user data
CREATE OR REPLACE FUNCTION public.get_user_data(user_id UUID)
RETURNS JSON
SECURITY DEFINER
SET search_path = public, pg_catalog
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
$$ LANGUAGE plpgsql;

-- Function to check if user profile exists
CREATE OR REPLACE FUNCTION public.user_profile_exists(user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    -- Security check: users can only check their own profile existence
    IF auth.uid() != user_id THEN
        RAISE EXCEPTION 'Access denied: You can only check your own profile existence';
    END IF;
    
    RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. SAMPLE DATA (OPTIONAL)
-- =====================================================
-- Uncomment to insert sample data for testing

/*
-- Sample profile data (replace with actual user ID from auth.users)
INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    full_name,
    business_name,
    bio,
    city,
    state
) VALUES (
    '00000000-0000-0000-0000-000000000000', -- Replace with actual user ID
    'sample@example.com',
    'John',
    'Doe',
    'John Doe',
    'Doe Real Estate',
    'Experienced real estate agent specializing in residential properties.',
    'San Francisco',
    'California'
) ON CONFLICT (id) DO NOTHING;
*/

-- =====================================================
-- 8. GRANTS AND PERMISSIONS
-- =====================================================
-- Grant necessary permissions for the application

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant permissions on tables
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_subscriptions TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.get_user_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_profile_exists(UUID) TO authenticated;

-- =====================================================
-- SETUP COMPLETE
-- =====================================================
-- Your database is now ready for the Spoqen Dashboard!
-- 
-- Next steps:
-- 1. Test the schema by creating a new user account
-- 2. Verify that profiles are created automatically
-- 3. Check that RLS policies are working correctly
-- 4. Customize the default values as needed
-- 
-- For troubleshooting, check the Supabase logs and ensure
-- your environment variables are correctly configured. 