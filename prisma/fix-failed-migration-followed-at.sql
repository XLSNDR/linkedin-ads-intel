-- Run in the SAME Supabase project that Vercel uses (check Vercel → Settings → Environment Variables → DATABASE_URL).
--
-- Step 1 (optional): See the failed migration row
-- SELECT id, migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" WHERE migration_name LIKE '%followed_at%';
--
-- Step 2: Remove the failed migration so Prisma will re-apply it (migration file now has IF NOT EXISTS, so it will succeed)
DELETE FROM "_prisma_migrations"
WHERE migration_name = '20260224100000_add_followed_at_to_user_advertiser';
