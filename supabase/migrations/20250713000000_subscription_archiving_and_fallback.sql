-- Migration: Add archiving and current row support to subscriptions
-- Purpose: Support fallback to free, avoid deletes, and enable user_id-centric logic

DO $$
BEGIN
  -- 1. Add 'ended_at' column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'ended_at'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD COLUMN ended_at timestamptz;
  END IF;

  -- 2. Add 'current' boolean column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'current'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD COLUMN current boolean NOT NULL DEFAULT true;
  END IF;

  -- 3. Add index on (user_id, current) for efficient lookups
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'subscriptions'
      AND indexname = 'idx_subscriptions_user_id_current'
  ) THEN
    CREATE INDEX idx_subscriptions_user_id_current
      ON public.subscriptions (user_id, current);
  END IF;

  -- 4. Add partial index on ended_at for archiving queries
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'subscriptions'
      AND indexname = 'idx_subscriptions_ended_at'
  ) THEN
    CREATE INDEX idx_subscriptions_ended_at
      ON public.subscriptions (ended_at)
      WHERE ended_at IS NOT NULL;
  END IF;
END $$;

-- Comments for clarity
COMMENT ON COLUMN public.subscriptions.ended_at IS 'Timestamp when the subscription ended or was archived. Null if current.';
COMMENT ON COLUMN public.subscriptions.current IS 'Indicates if this is the current active subscription for the user.'; 