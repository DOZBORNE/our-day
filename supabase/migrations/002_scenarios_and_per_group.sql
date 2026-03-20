-- Migration: Add cost scenarios, per-group pricing, and applicable flag
-- Run this in the Supabase SQL Editor after the initial schema

-- 1. Add group_size column to line_items (for per-group calculation)
ALTER TABLE line_items ADD COLUMN IF NOT EXISTS group_size INTEGER DEFAULT 1;

-- 2. Add percentage_target column to line_items (null = global, otherwise a category type)
ALTER TABLE line_items ADD COLUMN IF NOT EXISTS percentage_target TEXT DEFAULT NULL;

-- 3. Add applicable column to line_items
ALTER TABLE line_items ADD COLUMN IF NOT EXISTS applicable BOOLEAN DEFAULT true;

-- 4. Create cost_scenarios table
CREATE TABLE IF NOT EXISTS cost_scenarios (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create scenario_overrides table
CREATE TABLE IF NOT EXISTS scenario_overrides (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  scenario_id TEXT NOT NULL REFERENCES cost_scenarios(id) ON DELETE CASCADE,
  line_item_id TEXT NOT NULL REFERENCES line_items(id) ON DELETE CASCADE,
  applicable BOOLEAN DEFAULT true,
  cost_override NUMERIC DEFAULT NULL,
  notes_override TEXT DEFAULT NULL,
  UNIQUE(scenario_id, line_item_id)
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_cost_scenarios_venue ON cost_scenarios(venue_id);
CREATE INDEX IF NOT EXISTS idx_scenario_overrides_scenario ON scenario_overrides(scenario_id);
CREATE INDEX IF NOT EXISTS idx_scenario_overrides_line_item ON scenario_overrides(line_item_id);

-- 7. RLS policies (match existing pattern)
ALTER TABLE cost_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON cost_scenarios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON scenario_overrides FOR ALL USING (true) WITH CHECK (true);
