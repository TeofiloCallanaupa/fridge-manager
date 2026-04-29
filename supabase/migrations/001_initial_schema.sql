-- =============================================================================
-- 001_initial_schema.sql
-- Fridge Manager — Initial database schema
--
-- Creates all core tables, CHECK constraints, RLS policies, triggers,
-- and indexes. See docs/architecture.md for full schema documentation.
--
-- NOTE: RLS policies that reference household_members are deferred until
-- after that table is created to avoid forward-reference errors.
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. AUTO-UPDATE TRIGGER FUNCTION
-- Reusable function for updated_at columns across all tables.
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 2. PROFILES
-- Auto-created via trigger on auth.users insert.
-- SELECT policy deferred until after household_members is created.
-- =============================================================================

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name text,
  avatar_config jsonb,              -- DiceBear Avataaars config (rendered on demand)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- These policies don't reference other tables, so they can go here
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Auto-create profile when a user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- 3. HOUSEHOLDS
-- SELECT/UPDATE policies deferred until after household_members is created.
-- =============================================================================

CREATE TABLE households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  timezone text NOT NULL DEFAULT 'America/New_York',
  created_by uuid NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE households ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER households_updated_at
  BEFORE UPDATE ON households
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- INSERT doesn't reference household_members, so it can go here
CREATE POLICY "households_insert_authenticated"
  ON households FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- =============================================================================
-- 4. HOUSEHOLD MEMBERS
-- Many-to-many: users ↔ households
-- =============================================================================

CREATE TABLE household_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, user_id),
  CHECK (role IN ('owner', 'member'))
);

ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER household_members_updated_at
  BEFORE UPDATE ON household_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- 4a. DEFERRED RLS POLICIES & HELPERS
-- Now that household_members exists, create policies that reference it.
-- We use SECURITY DEFINER functions to prevent infinite recursion in RLS.
-- =============================================================================

-- Helper: Get households the user is a member of
CREATE OR REPLACE FUNCTION get_user_households()
RETURNS SETOF uuid AS $$
  SELECT household_id FROM household_members WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Helper: Get households the user owns
CREATE OR REPLACE FUNCTION get_user_owned_households()
RETURNS SETOF uuid AS $$
  SELECT household_id FROM household_members WHERE user_id = auth.uid() AND role = 'owner';
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- profiles SELECT (deferred from section 2)
CREATE POLICY "profiles_select_household"
  ON profiles FOR SELECT
  USING (
    id IN (
      SELECT user_id FROM household_members
      WHERE household_id IN (SELECT get_user_households())
    )
    OR id = auth.uid()  -- always see own profile even before joining a household
  );

-- households SELECT/UPDATE (deferred from section 3)
CREATE POLICY "households_select_member"
  ON households FOR SELECT
  USING (id IN (SELECT get_user_households()));

CREATE POLICY "households_update_member"
  ON households FOR UPDATE
  USING (id IN (SELECT get_user_households()));

-- household_members own policies
CREATE POLICY "household_members_select"
  ON household_members FOR SELECT
  USING (household_id IN (SELECT get_user_households()));

CREATE POLICY "household_members_insert"
  ON household_members FOR INSERT
  WITH CHECK (
    -- Users can only insert themselves as owner of a household they created.
    -- Invite acceptance goes through the Edge Function (service role, bypasses RLS).
    user_id = auth.uid()
    AND role = 'owner'
    AND household_id IN (
      SELECT id FROM households
      WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "household_members_update"
  ON household_members FOR UPDATE
  USING (household_id IN (SELECT get_user_owned_households()));

CREATE POLICY "household_members_delete"
  ON household_members FOR DELETE
  USING (
    household_id IN (SELECT get_user_owned_households())
    OR user_id = auth.uid()
  );

-- =============================================================================
-- 5. HOUSEHOLD INVITES
-- =============================================================================

CREATE TABLE household_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  invited_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  CHECK (status IN ('pending', 'accepted', 'expired'))
);

ALTER TABLE household_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household_invites_select"
  ON household_invites FOR SELECT
  USING (household_id IN (SELECT get_user_households()));

CREATE POLICY "household_invites_insert"
  ON household_invites FOR INSERT
  WITH CHECK (
    invited_by = auth.uid()
    AND household_id IN (SELECT get_user_owned_households())
  );

CREATE POLICY "household_invites_update"
  ON household_invites FOR UPDATE
  USING (household_id IN (SELECT get_user_owned_households()));

-- =============================================================================
-- 6. CATEGORIES (GLOBAL TABLE)
-- Public read, no client writes. Managed via migrations only.
-- =============================================================================

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  emoji text,
  display_order int NOT NULL,
  default_destination text,
  has_expiration boolean NOT NULL DEFAULT true,
  CHECK (default_destination IN ('fridge', 'freezer', 'pantry', 'none'))
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- RLS: Public read, no client writes.
CREATE POLICY "categories_select_all"
  ON categories FOR SELECT
  USING (true);

-- No INSERT/UPDATE/DELETE policies = no client writes.

-- =============================================================================
-- 7. GROCERY ITEMS
-- =============================================================================

CREATE TABLE grocery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households ON DELETE CASCADE,
  name text NOT NULL,
  quantity text,
  category_id uuid NOT NULL REFERENCES categories ON DELETE RESTRICT,
  destination text,
  checked boolean NOT NULL DEFAULT false,
  added_by uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  checked_by uuid REFERENCES auth.users ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  checked_at timestamptz,
  completed_at timestamptz,
  CHECK (destination IN ('fridge', 'freezer', 'pantry', 'none'))
);

ALTER TABLE grocery_items ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER grocery_items_updated_at
  BEFORE UPDATE ON grocery_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: Household isolation for all operations.
CREATE POLICY "grocery_items_select"
  ON grocery_items FOR SELECT
  USING (household_id IN (SELECT get_user_households()));

CREATE POLICY "grocery_items_insert"
  ON grocery_items FOR INSERT
  WITH CHECK (
    added_by = auth.uid()
    AND household_id IN (SELECT get_user_households())
  );

CREATE POLICY "grocery_items_update"
  ON grocery_items FOR UPDATE
  USING (household_id IN (SELECT get_user_households()));

CREATE POLICY "grocery_items_delete"
  ON grocery_items FOR DELETE
  USING (household_id IN (SELECT get_user_households()));

-- =============================================================================
-- 8. INVENTORY ITEMS
-- =============================================================================

CREATE TABLE inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households ON DELETE CASCADE,
  name text NOT NULL,
  quantity text,
  category_id uuid NOT NULL REFERENCES categories ON DELETE RESTRICT,
  location text NOT NULL,
  expiration_date date,
  expiration_source text,
  added_by uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  discarded_at timestamptz,
  discard_reason text,
  source text NOT NULL DEFAULT 'manual',
  CHECK (location IN ('fridge', 'freezer', 'pantry')),
  CHECK (discard_reason IS NULL OR discard_reason IN ('consumed', 'expired', 'wasted')),
  CHECK (source IN ('manual', 'grocery_checkout')),
  CHECK (expiration_source IS NULL OR expiration_source IN ('user', 'default'))
);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: Household isolation for all operations.
CREATE POLICY "inventory_items_select"
  ON inventory_items FOR SELECT
  USING (household_id IN (SELECT get_user_households()));

CREATE POLICY "inventory_items_insert"
  ON inventory_items FOR INSERT
  WITH CHECK (
    added_by = auth.uid()
    AND household_id IN (SELECT get_user_households())
  );

CREATE POLICY "inventory_items_update"
  ON inventory_items FOR UPDATE
  USING (household_id IN (SELECT get_user_households()));

CREATE POLICY "inventory_items_delete"
  ON inventory_items FOR DELETE
  USING (household_id IN (SELECT get_user_households()));

-- =============================================================================
-- 9. DEFAULT SHELF DAYS (GLOBAL TABLE)
-- Public read, no client writes. Managed via migrations only.
-- =============================================================================

CREATE TABLE default_shelf_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories ON DELETE CASCADE,
  location text NOT NULL,
  shelf_days int NOT NULL,
  UNIQUE (category_id, location)
);

ALTER TABLE default_shelf_days ENABLE ROW LEVEL SECURITY;

-- RLS: Public read, no client writes.
CREATE POLICY "default_shelf_days_select_all"
  ON default_shelf_days FOR SELECT
  USING (true);

-- No INSERT/UPDATE/DELETE policies = no client writes.

-- =============================================================================
-- 10. SEED DATA
-- Seed data is in 002_seed_categories.sql (separated per /coder convention).
-- =============================================================================

-- =============================================================================
-- 11. INDEXES
-- Performance indexes for common query patterns.
-- =============================================================================

-- Grocery list: active items by household, sorted by category
CREATE INDEX idx_grocery_items_household_active
  ON grocery_items (household_id, category_id)
  WHERE completed_at IS NULL;

-- Inventory: active items by household and location
CREATE INDEX idx_inventory_items_household_active
  ON inventory_items (household_id, location)
  WHERE discarded_at IS NULL;

-- Inventory: items approaching expiration (for notification cron)
CREATE INDEX idx_inventory_items_expiration
  ON inventory_items (expiration_date)
  WHERE discarded_at IS NULL AND expiration_date IS NOT NULL;

-- Sync: find rows changed since a timestamp (WatermelonDB pull)
CREATE INDEX idx_grocery_items_updated_at ON grocery_items (updated_at);
CREATE INDEX idx_inventory_items_updated_at ON inventory_items (updated_at);

-- Household member lookup (used by every RLS policy)
CREATE INDEX idx_household_members_user ON household_members (user_id);
