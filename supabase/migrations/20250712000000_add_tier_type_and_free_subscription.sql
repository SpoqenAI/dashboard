-- Migration: Add tier_type to subscriptions and free tier provisioning on email verification
-- Purpose: Support welcome flow and free/paid tier separation

DO $$
BEGIN
  -- 1. Add 'tier_type' column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'tier_type'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD COLUMN tier_type text NOT NULL DEFAULT 'free';
  END IF;

  -- 2. Add check constraint for 'tier_type' values (free, paid)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'subscriptions_tier_type_check'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_tier_type_check
      CHECK (tier_type IN ('free', 'paid'));
  END IF;

  -- 3. Add index on tier_type if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'subscriptions'
      AND indexname = 'idx_subscriptions_tier_type'
  ) THEN
    CREATE INDEX idx_subscriptions_tier_type
      ON public.subscriptions (tier_type);
  END IF;

  -- 4. Add composite index on (user_id, tier_type) if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'subscriptions'
      AND indexname = 'idx_subscriptions_user_id_tier_type'
  ) THEN
    CREATE INDEX idx_subscriptions_user_id_tier_type
      ON public.subscriptions (user_id, tier_type);
  END IF;

  -- 5. Create function to insert free subscription on email verification if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'handle_email_verified_for_free_subscription'
  ) THEN
    CREATE OR REPLACE FUNCTION public.handle_email_verified_for_free_subscription()
    RETURNS trigger AS $$
    BEGIN
      -- Only insert if email_confirmed_at is being set (was NULL, now NOT NULL)
      IF (TG_OP = 'UPDATE' AND NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL) THEN
        -- Only insert if user does not already have a subscription
        IF NOT EXISTS (
          SELECT 1 FROM public.subscriptions WHERE user_id = NEW.id
        ) THEN
          INSERT INTO public.subscriptions (
            id, user_id, status, tier_type, created_at, updated_at
          ) VALUES (
            gen_random_uuid()::text, NEW.id, 'active', 'free', NOW(), NOW()
          );
        END IF;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  END IF;

  -- 6. Create trigger on auth.users for email verification if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_handle_email_verified_for_free_subscription'
  ) THEN
    CREATE TRIGGER trg_handle_email_verified_for_free_subscription
    AFTER UPDATE OF email_confirmed_at ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_email_verified_for_free_subscription();
  END IF;
END $$;

-- Comments for clarity
COMMENT ON COLUMN public.subscriptions.tier_type IS 'Indicates whether the subscription is free or paid. Default is free.';
COMMENT ON CONSTRAINT subscriptions_tier_type_check ON public.subscriptions IS 'Restricts tier_type to free or paid.'; 