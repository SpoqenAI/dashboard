-- Create function to handle VAPI assistant provisioning via Edge Function
CREATE OR REPLACE FUNCTION handle_email_verification()
RETURNS TRIGGER AS $$
DECLARE
    project_url TEXT;
    service_role_key TEXT;
    request_id BIGINT;
BEGIN
    -- Only process when email_confirmed_at changes from NULL to a timestamp
    -- This means the user just verified their email
    IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
        
        -- Get project URL and service role key from vault or use environment
        -- These should be set as database secrets for security
        SELECT decrypted_secret INTO project_url 
        FROM vault.decrypted_secrets 
        WHERE name = 'SUPABASE_URL' 
        LIMIT 1;
        
        SELECT decrypted_secret INTO service_role_key 
        FROM vault.decrypted_secrets 
        WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' 
        LIMIT 1;
        
        -- Fallback to current project if vault secrets not configured
        IF project_url IS NULL THEN
            project_url := current_setting('app.settings.api_url', true);
        END IF;
        
        -- If still no URL, construct from current database
        IF project_url IS NULL THEN
            project_url := 'https://' || current_setting('app.settings.project_ref', true) || '.supabase.co';
        END IF;
        
        -- Only proceed if we have the necessary configuration
        IF project_url IS NOT NULL AND service_role_key IS NOT NULL THEN
            -- Make async HTTP request to the Edge Function
            -- Using pg_net for better reliability and async processing
            SELECT net.http_post(
                url := project_url || '/functions/v1/vapi-assistant-provision',
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || service_role_key
                ),
                body := jsonb_build_object(
                    'userId', NEW.id::text,
                    'email', NEW.email,
                    'triggerSource', 'email_verification'
                ),
                timeout_milliseconds := 30000
            ) INTO request_id;
            
            -- Log the request for monitoring
            INSERT INTO public.user_settings (
                id, 
                assistant_provisioning_status, 
                assistant_provisioning_started_at
            ) 
            VALUES (
                NEW.id, 
                'requested', 
                NOW()
            )
            ON CONFLICT (id) 
            DO UPDATE SET 
                assistant_provisioning_status = 'requested',
                assistant_provisioning_started_at = NOW(),
                updated_at = NOW();
                
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table for email verification
CREATE TRIGGER trigger_email_verification_vapi_provision
    AFTER UPDATE OF email_confirmed_at ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_email_verification();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA net TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA net TO postgres, service_role;