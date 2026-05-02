-- Add FK from inventory_items.added_by → profiles.id and grocery_items.added_by → profiles.id
-- This enables PostgREST to resolve `profiles:added_by (display_name)` join hints.
-- The existing FK to auth.users remains; this adds a second FK for the profiles join path.

ALTER TABLE inventory_items
  ADD CONSTRAINT inventory_items_added_by_profiles_fk
  FOREIGN KEY (added_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE grocery_items
  ADD CONSTRAINT grocery_items_added_by_profiles_fk
  FOREIGN KEY (added_by) REFERENCES profiles(id) ON DELETE CASCADE;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
