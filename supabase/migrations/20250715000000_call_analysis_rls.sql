-- RLS policies for call_analysis table to allow authenticated users to manage their own rows
-- Generated on 2025-07-15

-- Enable RLS (should already be enabled, but keep idempotent)
alter table public.call_analysis enable row level security;

-- Drop existing policies if they exist to avoid duplicates (idempotent guard)
DROP POLICY IF EXISTS "Allow insert own call analysis" ON public.call_analysis;
DROP POLICY IF EXISTS "Allow select own call analysis" ON public.call_analysis;
DROP POLICY IF EXISTS "Allow update own call analysis" ON public.call_analysis;
DROP POLICY IF EXISTS "Allow delete own call analysis" ON public.call_analysis;

-- INSERT: Only allow inserting rows where user_id matches auth.uid()
CREATE POLICY "Allow insert own call analysis"
  ON public.call_analysis
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- SELECT: Users can read only their own analysis rows
CREATE POLICY "Allow select own call analysis"
  ON public.call_analysis
  FOR SELECT
  USING (auth.uid() = user_id);

-- UPDATE: Users can modify their own rows
CREATE POLICY "Allow update own call analysis"
  ON public.call_analysis
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users may delete their own rows (optional – adjust if not desired)
CREATE POLICY "Allow delete own call analysis"
  ON public.call_analysis
  FOR DELETE
  USING (auth.uid() = user_id); 