-- =====================================================
-- Create Full Profile Stored Procedure
-- =====================================================
-- This procedure creates a complete user profile atomically
-- within a transaction, ensuring all-or-nothing execution

CREATE OR REPLACE FUNCTION public.create_full_profile(
    p_user_id UUID,
    p_email TEXT,
    p_first_name TEXT DEFAULT NULL,
    p_last_name TEXT DEFAULT NULL,
    p_full_name TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_avatar_url TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    result JSON;
    profile_record RECORD;
    settings_record RECORD;
    subscription_record RECORD;
BEGIN
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
        -- 1. Upsert profile record
        INSERT INTO public.profiles (
            id,
            email,
            first_name,
            last_name,
            full_name,
            phone,
            avatar_url,
            last_login
        ) VALUES (
            p_user_id,
            p_email,
            NULLIF(trim(p_first_name), ''),
            NULLIF(trim(p_last_name), ''),
            NULLIF(trim(p_full_name), ''),
            NULLIF(trim(p_phone), ''),
            NULLIF(trim(p_avatar_url), ''),
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
        
        -- 2. Upsert user settings with defaults
        INSERT INTO public.user_settings (id)
        VALUES (p_user_id)
        ON CONFLICT (id) DO UPDATE SET
            updated_at = NOW()
        RETURNING * INTO settings_record;
        
        -- 3. Upsert user subscription with free plan
        INSERT INTO public.user_subscriptions (
            id,
            plan_type,
            status
        ) VALUES (
            p_user_id,
            'free',
            'active'
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
            
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Unexpected error during profile creation for user %: % (SQLSTATE: %)', 
                p_user_id, SQLERRM, SQLSTATE;
    END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_full_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.create_full_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) IS 
'Creates a complete user profile atomically within a transaction. Upserts records in profiles, user_settings, and user_subscriptions tables. Returns JSON with success status and created records.'; 