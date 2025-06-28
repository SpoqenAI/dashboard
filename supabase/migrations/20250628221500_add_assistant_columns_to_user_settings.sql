-- Add assistant_name and ai_greeting back to public.user_settings
-- This migration is idempotent: it checks for column existence first so it can
-- safely run on databases that still have these columns.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns 
        WHERE table_schema = 'public'
          AND table_name   = 'user_settings'
          AND column_name  = 'assistant_name'
    ) THEN
        ALTER TABLE public.user_settings
            ADD COLUMN assistant_name text NOT NULL DEFAULT 'Ava';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns 
        WHERE table_schema = 'public'
          AND table_name   = 'user_settings'
          AND column_name  = 'ai_greeting'
    ) THEN
        ALTER TABLE public.user_settings
            ADD COLUMN ai_greeting text NOT NULL DEFAULT 'Hello! Thank you for calling. How can I assist you today?';
    END IF;
END $$; 