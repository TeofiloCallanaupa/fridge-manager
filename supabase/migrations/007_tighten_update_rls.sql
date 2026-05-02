-- Tighten UPDATE policies with WITH CHECK to prevent household_id reassignment.
-- Without WITH CHECK, a crafted raw Supabase call could theoretically move an item
-- to another household. This adds defense-in-depth alongside TypeScript type safety.

-- inventory_items: drop and recreate with WITH CHECK
DROP POLICY "inventory_items_update" ON inventory_items;
CREATE POLICY "inventory_items_update"
  ON inventory_items FOR UPDATE
  USING (household_id IN (SELECT get_user_households()))
  WITH CHECK (household_id IN (SELECT get_user_households()));

-- grocery_items: drop and recreate with WITH CHECK
DROP POLICY "grocery_items_update" ON grocery_items;
CREATE POLICY "grocery_items_update"
  ON grocery_items FOR UPDATE
  USING (household_id IN (SELECT get_user_households()))
  WITH CHECK (household_id IN (SELECT get_user_households()));
