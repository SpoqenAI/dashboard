-- Add unique constraint on assistants.user_id so each user can only have one assistant
-- First check if constraint already exists to avoid errors
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'assistants_user_id_key'
    ) THEN
        ALTER TABLE public.assistants
        ADD CONSTRAINT assistants_user_id_key UNIQUE (user_id);
    END IF;
END $$; 