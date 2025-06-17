-- Add unique index on subscriptions.user_id so each user can own at most one subscription
-- Safe to run repeatedly thanks to IF NOT EXISTS guard

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM   pg_constraint
        WHERE  conname = 'subscriptions_user_id_key'
    ) THEN
        ALTER TABLE public.subscriptions
        ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);
    END IF;
END $$; 