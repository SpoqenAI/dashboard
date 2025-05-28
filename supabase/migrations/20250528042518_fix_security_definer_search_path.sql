-- Fix security vulnerability in SECURITY DEFINER functions
-- Add explicit search_path to prevent privilege escalation attacks

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
