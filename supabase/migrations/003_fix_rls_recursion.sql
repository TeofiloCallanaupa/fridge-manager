-- Fix infinite recursion in RLS policies by using a SECURITY DEFINER function
-- to look up the user's households, avoiding recursive querying of household_members.

-- 1. Create helper functions that bypass RLS
CREATE OR REPLACE FUNCTION get_user_households()
RETURNS SETOF uuid AS $$
  SELECT household_id FROM household_members WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_user_owned_households()
RETURNS SETOF uuid AS $$
  SELECT household_id FROM household_members WHERE user_id = auth.uid() AND role = 'owner';
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 2. Drop existing recursive policies
DROP POLICY IF EXISTS "profiles_select_household" ON profiles;
DROP POLICY IF EXISTS "households_select_member" ON households;
DROP POLICY IF EXISTS "households_update_member" ON households;
DROP POLICY IF EXISTS "household_members_select" ON household_members;
DROP POLICY IF EXISTS "household_members_insert" ON household_members;
DROP POLICY IF EXISTS "household_members_update" ON household_members;
DROP POLICY IF EXISTS "household_members_delete" ON household_members;
DROP POLICY IF EXISTS "household_invites_select" ON household_invites;
DROP POLICY IF EXISTS "household_invites_insert" ON household_invites;
DROP POLICY IF EXISTS "household_invites_update" ON household_invites;
DROP POLICY IF EXISTS "grocery_items_select" ON grocery_items;
DROP POLICY IF EXISTS "grocery_items_insert" ON grocery_items;
DROP POLICY IF EXISTS "grocery_items_update" ON grocery_items;
DROP POLICY IF EXISTS "grocery_items_delete" ON grocery_items;
DROP POLICY IF EXISTS "inventory_items_select" ON inventory_items;
DROP POLICY IF EXISTS "inventory_items_insert" ON inventory_items;
DROP POLICY IF EXISTS "inventory_items_update" ON inventory_items;
DROP POLICY IF EXISTS "inventory_items_delete" ON inventory_items;

-- 3. Recreate policies using the helper function
CREATE POLICY "profiles_select_household"
  ON profiles FOR SELECT
  USING (
    id IN (
      SELECT user_id FROM household_members 
      WHERE household_id IN (SELECT get_user_households())
    )
    OR id = auth.uid()
  );

CREATE POLICY "households_select_member"
  ON households FOR SELECT
  USING (id IN (SELECT get_user_households()));

CREATE POLICY "households_update_member"
  ON households FOR UPDATE
  USING (id IN (SELECT get_user_households()));

CREATE POLICY "household_members_select"
  ON household_members FOR SELECT
  USING (household_id IN (SELECT get_user_households()));

CREATE POLICY "household_members_insert"
  ON household_members FOR INSERT
  WITH CHECK (
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
