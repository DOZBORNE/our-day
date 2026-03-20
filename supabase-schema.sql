-- Wedding Planner - Supabase Schema
-- Run this SQL in the Supabase SQL Editor to create all tables

-- Budget Settings (app-level)
CREATE TABLE budget_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  total_budget NUMERIC NOT NULL DEFAULT 50000,
  guest_count INTEGER NOT NULL DEFAULT 150
);

-- Vendors (reusable across venues)
CREATE TABLE vendors (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  contact_info TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Venues
CREATE TABLE venues (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  location TEXT DEFAULT '',
  description TEXT DEFAULT '',
  contact_info TEXT DEFAULT '',
  capacity_seated INTEGER DEFAULT 0,
  capacity_standing INTEGER DEFAULT 0,
  venue_type TEXT NOT NULL DEFAULT 'all-inclusive',
  indoor BOOLEAN DEFAULT true,
  outdoor BOOLEAN DEFAULT false,
  weather_backup TEXT DEFAULT '',
  parking_info TEXT DEFAULT '',
  accessibility_notes TEXT DEFAULT '',
  pros TEXT[] DEFAULT '{}',
  cons TEXT[] DEFAULT '{}',
  rating INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Cost Categories (belong to a venue)
CREATE TABLE cost_categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  included_in_venue BOOLEAN DEFAULT false,
  required_through_venue BOOLEAN DEFAULT false,
  vendor_id TEXT REFERENCES vendors(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0
);

-- Line Items (belong to a cost category OR a vendor)
CREATE TABLE line_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  category_id TEXT REFERENCES cost_categories(id) ON DELETE CASCADE,
  vendor_id TEXT REFERENCES vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cost NUMERIC DEFAULT 0,
  quantity INTEGER DEFAULT 1,
  calculation_type TEXT DEFAULT 'flat',
  included BOOLEAN DEFAULT true,
  notes TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0
);

-- Venue Dates
CREATE TABLE venue_dates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  day_of_week TEXT DEFAULT '',
  pricing_tier TEXT DEFAULT 'weekday',
  tier_price_adjustment NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'available',
  notes TEXT DEFAULT ''
);

-- Contracts (belong to a venue)
CREATE TABLE contracts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  deposit_amount NUMERIC DEFAULT 0,
  deposit_due_date DATE,
  cancellation_policy TEXT DEFAULT '',
  force_majeure TEXT DEFAULT '',
  vendor_restrictions TEXT DEFAULT '',
  noise_restrictions TEXT DEFAULT '',
  time_restrictions TEXT DEFAULT '',
  decor_restrictions TEXT DEFAULT '',
  additional_notes TEXT DEFAULT ''
);

-- Payment Milestones (belong to a contract)
CREATE TABLE payment_milestones (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  contract_id TEXT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  due_date DATE,
  paid BOOLEAN DEFAULT false
);

-- Indexes for performance
CREATE INDEX idx_cost_categories_venue ON cost_categories(venue_id);
CREATE INDEX idx_cost_categories_vendor ON cost_categories(vendor_id);
CREATE INDEX idx_line_items_category ON line_items(category_id);
CREATE INDEX idx_line_items_vendor ON line_items(vendor_id);
CREATE INDEX idx_venue_dates_venue ON venue_dates(venue_id);
CREATE INDEX idx_venue_dates_date ON venue_dates(date);
CREATE INDEX idx_contracts_venue ON contracts(venue_id);
CREATE INDEX idx_payment_milestones_contract ON payment_milestones(contract_id);

-- Disable RLS (simple shared access)
ALTER TABLE budget_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_milestones ENABLE ROW LEVEL SECURITY;

-- Allow all operations (no auth required)
CREATE POLICY "Allow all" ON budget_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON vendors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON venues FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON cost_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON line_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON venue_dates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON contracts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON payment_milestones FOR ALL USING (true) WITH CHECK (true);
