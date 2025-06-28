-- Cleanup migration: remove assistant_name and ai_greeting columns now that assistants table owns these fields
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public'
          AND table_name='user_settings'
          AND column_name='assistant_name') THEN
        ALTER TABLE public.user_settings DROP COLUMN assistant_name;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public'
          AND table_name='user_settings'
          AND column_name='ai_greeting') THEN
        ALTER TABLE public.user_settings DROP COLUMN ai_greeting;
    END IF;
END $$; 