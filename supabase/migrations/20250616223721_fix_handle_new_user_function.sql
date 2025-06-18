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
$$ LANGUAGE plpgsql;
