-- Fix security vulnerability in handle_updated_at function
-- Add SECURITY DEFINER and explicit search_path to prevent privilege escalation and function hijacking

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
