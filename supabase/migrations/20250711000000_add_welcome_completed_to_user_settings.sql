-- Migration: Add welcome_completed to user_settings
-- Purpose: Tracks whether the user has completed or skipped the one-time welcome experience.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_settings'
      AND column_name = 'welcome_completed'
  ) THEN
    ALTER TABLE public.user_settings
      ADD COLUMN welcome_completed boolean DEFAULT false;

    COMMENT ON COLUMN public.user_settings.welcome_completed IS
      'Tracks whether the user has completed or skipped the one-time welcome experience.';

    CREATE INDEX IF NOT EXISTS idx_user_settings_welcome_completed
      ON public.user_settings (welcome_completed);
  END IF;
END $$; 