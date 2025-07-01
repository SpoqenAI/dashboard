-- Add vapi_assistant_id column to public.user_settings and enforce uniqueness
-- This migration is idempotent and safe to run multiple times

DO $$
BEGIN
    -- 1. Add column if it does not exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'user_settings'
          AND column_name  = 'vapi_assistant_id')
    THEN
        ALTER TABLE public.user_settings
            ADD COLUMN vapi_assistant_id text;
    END IF;

    -- 2. Ensure uniqueness of vapi_assistant_id (each assistant belongs to one user)
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename  = 'user_settings'
          AND indexname  = 'user_settings_vapi_assistant_id_key')
    THEN
        CREATE UNIQUE INDEX user_settings_vapi_assistant_id_key
            ON public.user_settings (vapi_assistant_id);
    END IF;
END $$; 