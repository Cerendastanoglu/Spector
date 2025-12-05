-- AlterTable (rename Session to session)
-- This migration is a no-op if the table is already lowercase
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Session') THEN
        ALTER TABLE "Session" RENAME TO "session";
    END IF;
END $$;
