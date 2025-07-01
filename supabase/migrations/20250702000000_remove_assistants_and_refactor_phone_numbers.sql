-- Cleanup: remove deprecated assistants table and migrate phone_numbers to be tied directly to users
-- This migration is idempotent and safe to run multiple times.

DO $$
BEGIN
    /* -----------------------------------------------------------------
       1. Add user_id to phone_numbers (nullable for backfill)          
    ----------------------------------------------------------------- */
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'phone_numbers'
          AND column_name = 'user_id') THEN
        ALTER TABLE public.phone_numbers
            ADD COLUMN user_id uuid;
    END IF;

    /* -----------------------------------------------------------------
       2. Back-fill user_id using existing assistant_id link            
    ----------------------------------------------------------------- */
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'phone_numbers'
          AND column_name = 'assistant_id') THEN
        UPDATE public.phone_numbers AS p
        SET    user_id = a.user_id
        FROM   public.assistants AS a
        WHERE  p.assistant_id = a.id
          AND  p.user_id IS NULL;
    END IF;

    /* -----------------------------------------------------------------
       3. Enforce NOT NULL + uniqueness on user_id                      
    ----------------------------------------------------------------- */
    -- Only make NOT NULL if every row has a value
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'phone_numbers'
          AND column_name = 'user_id'
          AND is_nullable = 'YES') THEN
        -- Ensure no NULLs remain before altering
        IF NOT EXISTS (SELECT 1 FROM public.phone_numbers WHERE user_id IS NULL) THEN
            ALTER TABLE public.phone_numbers
                ALTER COLUMN user_id SET NOT NULL;
        END IF;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename  = 'phone_numbers'
          AND indexname  = 'phone_numbers_user_id_key') THEN
        ALTER TABLE public.phone_numbers
            ADD CONSTRAINT phone_numbers_user_id_key UNIQUE (user_id);
    END IF;

    /* -----------------------------------------------------------------
       4. Drop old assistant_id FK and column                           
    ----------------------------------------------------------------- */
    -- Drop FK if exists
    DO $$DECLARE
        fk_name text;
    BEGIN
        SELECT tc.constraint_name INTO fk_name
        FROM information_schema.table_constraints AS tc
        WHERE tc.table_schema = 'public'
          AND tc.table_name   = 'phone_numbers'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND tc.constraint_name ~ 'assistant_id';
        IF fk_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.phone_numbers DROP CONSTRAINT %I', fk_name);
        END IF;
    END$$;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'phone_numbers'
          AND column_name = 'assistant_id') THEN
        ALTER TABLE public.phone_numbers DROP COLUMN assistant_id;
    END IF;

    /* -----------------------------------------------------------------
       5. Drop deprecated assistants table and type                     
    ----------------------------------------------------------------- */
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name   = 'assistants') THEN
        DROP TABLE public.assistants CASCADE;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'assistant_status') THEN
        DROP TYPE assistant_status;
    END IF;
END $$; 