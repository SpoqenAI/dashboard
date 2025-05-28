-- Add assistant_name field to user_settings table
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS assistant_name TEXT DEFAULT 'Ava';

-- Update existing rows to have the default assistant name if they don't have one
UPDATE public.user_settings 
SET assistant_name = 'Ava' 
WHERE assistant_name IS NULL; 