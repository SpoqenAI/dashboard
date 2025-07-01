-- Enable RLS and add simple owner policy for phone_numbers
DO $$
BEGIN
    -- Enable RLS if not already
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy WHERE schemaname='public' AND tablename='phone_numbers'
    ) THEN
        ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;
    END IF;

    -- Drop existing policy to avoid duplicates
    IF EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='phone_numbers' AND policyname='phone_owner'
    ) THEN
        ALTER TABLE public.phone_numbers DROP POLICY phone_owner;
    END IF;

    -- Create owner-based SELECT / INSERT / UPDATE policy
    CREATE POLICY phone_owner ON public.phone_numbers
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
END $$; 