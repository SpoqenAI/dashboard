-- Switch VAPI assistant provisioning from email verification to welcome completion
-- This migration replaces the email verification trigger with a welcome completion trigger

-- First, drop the existing email verification trigger and function
DROP TRIGGER IF EXISTS trigger_email_verification_vapi_provision ON auth.users;
DROP FUNCTION IF EXISTS handle_email_verification();

-- Create new function to handle VAPI assistant provisioning on welcome completion
CREATE OR REPLACE FUNCTION handle_welcome_completion()
RETURNS TRIGGER AS $$
DECLARE
    project_url TEXT;
    service_role_key TEXT;
    request_id BIGINT;
    user_email TEXT;
BEGIN
    -- Only process when welcome_completed changes from false/null to true
    -- This means the user just completed the welcome flow
    IF (OLD.welcome_completed IS FALSE OR OLD.welcome_completed IS NULL) AND NEW.welcome_completed IS TRUE THEN
        
        -- Get the user's email from auth.users table
        SELECT email INTO user_email 
        FROM auth.users 
        WHERE id = NEW.id;
        
        -- Skip if we can't find the user's email
        IF user_email IS NULL THEN
            RAISE WARNING 'Cannot find email for user_id: %', NEW.id;
            RETURN NEW;
        END IF;
        
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
                    'Authorization', 'Bearer ' || service_role_key,
                    'x-webhook-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'WEBHOOK_SECRET' LIMIT 1)
                ),
                body := jsonb_build_object(
                    'user_id', NEW.id::text,
                    'email', user_email,
                    'triggerSource', 'welcome_completion'
                ),
                timeout_milliseconds := 30000
            ) INTO request_id;
            
            -- Update the assistant provisioning status
            UPDATE public.user_settings 
            SET 
                assistant_provisioning_status = 'requested',
                assistant_provisioning_started_at = NOW(),
                updated_at = NOW()
            WHERE id = NEW.id;
                
        ELSE
            RAISE WARNING 'Missing configuration for VAPI assistant provisioning: project_url=%, service_role_key=%', 
                project_url IS NOT NULL, service_role_key IS NOT NULL;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on user_settings table for welcome completion
CREATE TRIGGER trigger_welcome_completion_vapi_provision
    AFTER UPDATE OF welcome_completed ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION handle_welcome_completion();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA net TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA net TO postgres, service_role;

-- Add comment explaining the change
COMMENT ON FUNCTION handle_welcome_completion() IS 
'Triggers VAPI assistant provisioning when user completes welcome flow. Replaces email verification trigger.';

COMMENT ON TRIGGER trigger_welcome_completion_vapi_provision ON public.user_settings IS 
'Provisions VAPI assistant when welcome_completed changes from false/null to true';
