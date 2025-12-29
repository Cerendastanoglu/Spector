-- Rename session table to Session (uppercase) for Shopify PrismaSessionStorage compatibility
DO $$ 
BEGIN
    -- Check if lowercase 'session' exists and rename it to 'Session'
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'session'
    ) THEN
        ALTER TABLE "session" RENAME TO "Session";
        RAISE NOTICE 'Renamed table session to Session';
    -- If 'Session' already exists, do nothing
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'Session'
    ) THEN
        RAISE NOTICE 'Table Session already exists';
    ELSE
        RAISE WARNING 'Neither session nor Session table found';
    END IF;
END $$;
