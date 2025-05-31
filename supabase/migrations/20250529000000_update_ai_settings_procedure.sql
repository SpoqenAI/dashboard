-- =====================================================
-- Update AI Settings Stored Procedure
-- =====================================================
-- This procedure atomically updates AI receptionist settings across
-- both user_settings and profiles tables within a transaction

CREATE OR REPLACE FUNCTION public.update_ai_settings(
    p_user_id UUID,
    p_assistant_name TEXT,
    p_ai_greeting TEXT,
    p_first_name TEXT DEFAULT NULL,
    p_last_name TEXT DEFAULT NULL,
    p_business_name TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_ai_settings(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.update_ai_settings(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) IS 
'Atomically updates AI receptionist settings across user_settings and profiles tables within a transaction. Updates assistant_name and ai_greeting in user_settings, and optionally updates first_name, last_name, and business_name in profiles. Returns JSON with success status and updated records.'; 