-- Migration: Multi-user support
-- Run this in the Supabase SQL Editor.
--
-- Adds user_id ownership to top-level tables (venues, vendors, budget_settings).
-- Child tables (cost_categories, line_items, cost_scenarios, scenario_overrides,
-- venue_dates, contracts, payment_milestones) inherit ownership through their
-- parent FKs, so they don't need a user_id column.
--
-- Existing data is backfilled to user 'devin&jess' (the original single user).
-- A budget row is seeded for 'morgan&caleb' so their first load has something.
-- These IDs match the USERS array in src/hooks.server.ts — keep them in sync.

-- 1. Add user_id to top-level tables (nullable for the backfill step)
ALTER TABLE venues          ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE vendors         ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE budget_settings ADD COLUMN IF NOT EXISTS user_id TEXT;

-- 2. Backfill existing rows to the original user
UPDATE venues          SET user_id = 'devin&jess' WHERE user_id IS NULL;
UPDATE vendors         SET user_id = 'devin&jess' WHERE user_id IS NULL;
UPDATE budget_settings SET user_id = 'devin&jess' WHERE user_id IS NULL;

-- 3. Lock the column down
ALTER TABLE venues          ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE vendors         ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE budget_settings ALTER COLUMN user_id SET NOT NULL;

-- 4. Indexes for per-user queries
CREATE INDEX IF NOT EXISTS idx_venues_user_id          ON venues(user_id);
CREATE INDEX IF NOT EXISTS idx_vendors_user_id         ON vendors(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_settings_user_id ON budget_settings(user_id);

-- 5. budget_settings is one-row-per-user — make user_id the PK.
--    Drop the old id-based PK first; the id column itself stays (harmless).
ALTER TABLE budget_settings DROP CONSTRAINT IF EXISTS budget_settings_pkey;
ALTER TABLE budget_settings ADD  CONSTRAINT budget_settings_pkey PRIMARY KEY (user_id);

-- 6. Seed a budget row for the second user so the app has something to load
INSERT INTO budget_settings (user_id, total_budget, guest_count)
VALUES ('morgan&caleb', 50000, 150)
ON CONFLICT (user_id) DO NOTHING;
