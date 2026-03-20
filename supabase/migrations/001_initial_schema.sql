-- Wedding Planner Database Schema
-- Run this in Supabase SQL Editor: Dashboard > SQL Editor > New query

-- ══════════════════════════════════════════
-- BUDGET SETTINGS
-- ══════════════════════════════════════════
create table if not exists budget_settings (
  id text primary key default gen_random_uuid()::text,
  total_budget numeric not null default 50000,
  guest_count integer not null default 150
);

-- ══════════════════════════════════════════
-- VENUES
-- ══════════════════════════════════════════
create table if not exists venues (
  id text primary key default gen_random_uuid()::text,
  name text not null default 'New Venue',
  location text not null default '',
  description text not null default '',
  contact_info text not null default '',
  capacity_seated integer not null default 0,
  capacity_standing integer not null default 0,
  venue_type text not null default 'all-inclusive'
    check (venue_type in ('all-inclusive', 'semi-inclusive', 'open-vendor')),
  indoor boolean not null default true,
  outdoor boolean not null default false,
  weather_backup text not null default '',
  parking_info text not null default '',
  accessibility_notes text not null default '',
  pros jsonb not null default '[]'::jsonb,
  cons jsonb not null default '[]'::jsonb,
  rating integer not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ══════════════════════════════════════════
-- VENDORS
-- ══════════════════════════════════════════
create table if not exists vendors (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  category text not null
    check (category in (
      'venue-rental', 'time', 'catering', 'bar', 'cake', 'staffing',
      'rentals-included', 'rental-upgrades', 'decor-floral', 'entertainment',
      'photo-video', 'planning', 'fees-taxes', 'transportation', 'miscellaneous'
    )),
  contact_info text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- ══════════════════════════════════════════
-- COST CATEGORIES
-- ══════════════════════════════════════════
create table if not exists cost_categories (
  id text primary key default gen_random_uuid()::text,
  venue_id text not null references venues(id) on delete cascade,
  name text not null,
  type text not null
    check (type in (
      'venue-rental', 'time', 'catering', 'bar', 'cake', 'staffing',
      'rentals-included', 'rental-upgrades', 'decor-floral', 'entertainment',
      'photo-video', 'planning', 'fees-taxes', 'transportation', 'miscellaneous'
    )),
  included_in_venue boolean not null default false,
  required_through_venue boolean not null default false,
  vendor_id text references vendors(id) on delete set null,
  sort_order integer not null default 0
);

-- ══════════════════════════════════════════
-- LINE ITEMS
-- ══════════════════════════════════════════
create table if not exists line_items (
  id text primary key default gen_random_uuid()::text,
  category_id text references cost_categories(id) on delete cascade,
  vendor_id text references vendors(id) on delete cascade,
  name text not null,
  cost numeric not null default 0,
  quantity integer not null default 1,
  calculation_type text not null default 'flat'
    check (calculation_type in ('flat', 'per-person', 'percentage')),
  included boolean not null default true,
  notes text not null default '',
  sort_order integer not null default 0
);

-- ══════════════════════════════════════════
-- VENUE DATES
-- ══════════════════════════════════════════
create table if not exists venue_dates (
  id text primary key default gen_random_uuid()::text,
  venue_id text not null references venues(id) on delete cascade,
  date date not null,
  day_of_week text not null,
  pricing_tier text not null default 'weekday'
    check (pricing_tier in ('saturday', 'friday-sunday', 'weekday')),
  tier_price_adjustment numeric not null default 0,
  status text not null default 'available'
    check (status in ('available', 'held', 'booked')),
  notes text not null default ''
);

-- ══════════════════════════════════════════
-- CONTRACTS
-- ══════════════════════════════════════════
create table if not exists contracts (
  id text primary key default gen_random_uuid()::text,
  venue_id text not null references venues(id) on delete cascade,
  deposit_amount numeric not null default 0,
  deposit_due_date text not null default '',
  cancellation_policy text not null default '',
  force_majeure text not null default '',
  vendor_restrictions text not null default '',
  noise_restrictions text not null default '',
  time_restrictions text not null default '',
  decor_restrictions text not null default '',
  additional_notes text not null default ''
);

-- ══════════════════════════════════════════
-- PAYMENT MILESTONES
-- ══════════════════════════════════════════
create table if not exists payment_milestones (
  id text primary key default gen_random_uuid()::text,
  contract_id text not null references contracts(id) on delete cascade,
  description text not null default '',
  amount numeric not null default 0,
  due_date text not null default '',
  paid boolean not null default false
);

-- ══════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ══════════════════════════════════════════
-- For now, allow all operations with the anon key.
-- When you add auth, replace these with user-scoped policies.

alter table budget_settings enable row level security;
alter table venues enable row level security;
alter table vendors enable row level security;
alter table cost_categories enable row level security;
alter table line_items enable row level security;
alter table venue_dates enable row level security;
alter table contracts enable row level security;
alter table payment_milestones enable row level security;

-- Public access policies (no auth required)
create policy "Allow all on budget_settings" on budget_settings for all using (true) with check (true);
create policy "Allow all on venues" on venues for all using (true) with check (true);
create policy "Allow all on vendors" on vendors for all using (true) with check (true);
create policy "Allow all on cost_categories" on cost_categories for all using (true) with check (true);
create policy "Allow all on line_items" on line_items for all using (true) with check (true);
create policy "Allow all on venue_dates" on venue_dates for all using (true) with check (true);
create policy "Allow all on contracts" on contracts for all using (true) with check (true);
create policy "Allow all on payment_milestones" on payment_milestones for all using (true) with check (true);
