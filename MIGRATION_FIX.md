# Migration Issue Analysis and Fix

## Problem Summary
The Shopify PrismaSessionStorage library requires the Prisma model name to match the database table name exactly. Our database has inconsistent table naming:
- Initial migration created: `"Session"` (uppercase)
- At some point the table became: `"session"` (lowercase)  
- Prisma schema expects: `Session` (uppercase, no @@map)
- PrismaSessionStorage looks for: `Session` (uppercase)

## Current State
- Database table: `session` (lowercase)
- Prisma model: `Session` (no @@map)
- Expected by Shopify lib: `Session` (uppercase)
- Result: **MissingSessionTableError**

## Root Cause
The `20251204205052_map_session_table_to_lowercase` migration that was created earlier tried to rename `Session` → `session` but this is incompatible with Shopify's PrismaSessionStorage which REQUIRES the table to be named exactly `Session`.

## Solution
We need to ensure the database table is uppercase `Session` to match what PrismaSessionStorage expects.

## Migration Strategy

### Step 1: Remove old problematic migrations
Delete the `20251204205052_map_session_table_to_lowercase` migration that caused the issue.

### Step 2: Create a proper migration
Create `20251213003742_fix_session_table_uppercase` that:
- Checks if `session` (lowercase) exists → rename to `Session`
- Checks if `Session` (uppercase) already exists → do nothing
- Is idempotent and safe to run multiple times

### Step 3: Mark failed migrations as resolved
If the old migration is stuck in failed state in production:
```bash
npx prisma migrate resolve --rolled-back "20251204205052_map_session_table_to_lowercase"
```

### Step 4: Deploy
Run `prisma migrate deploy` which will:
1. Skip already-applied migrations
2. Apply the new `20251213003742_fix_session_table_uppercase` migration
3. Rename `session` → `Session` in the database

## Verification Steps

### Local
```bash
# Check migration status
npx prisma migrate status

# Apply migrations
npx prisma migrate deploy

# Verify table exists
npx prisma db execute --stdin <<< "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename ILIKE 'session';"
```

### Production (Cloud Run)
```bash
# Check logs for migration success
gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=spector AND textPayload=~"migration"' --limit 10

# Check for Session table errors (should be gone)
gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=spector AND textPayload=~"MissingSessionTableError"' --limit 5
```

## Key Learnings

1. **Never use @@map() with Shopify PrismaSessionStorage** - It expects model name = table name
2. **PostgreSQL table names are case-sensitive when quoted** - `"Session"` ≠ `"session"`
3. **Migrations must be idempotent** - Use IF EXISTS checks for safety
4. **Test migrations locally before deploying** - Especially table renames
5. **Keep migration history clean** - Don't delete migrations that have been applied

## Files Modified
- `prisma/schema.prisma` - Removed `@@map("session")` from Session model
- `prisma/migrations/20251213003742_fix_session_table_uppercase/migration.sql` - New migration to rename table
- Deleted: `prisma/migrations/20251204205052_map_session_table_to_lowercase/` - Old problematic migration

## Expected Outcome
After deployment:
- ✅ Database has `Session` table (uppercase)
- ✅ Prisma client works correctly
- ✅ PrismaSessionStorage finds the table
- ✅ No more MissingSessionTableError
- ✅ HMAC verification works (can access sessions)
