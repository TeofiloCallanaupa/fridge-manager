-- Add 'foodkeeper' as a valid expiration_source value.
-- Phase 4.8 introduced FoodKeeper fuzzy matching as a Tier 1 shelf-life source,
-- but the original CHECK constraint only allowed 'user' and 'default'.

ALTER TABLE inventory_items
  DROP CONSTRAINT IF EXISTS inventory_items_expiration_source_check;

ALTER TABLE inventory_items
  ADD CONSTRAINT inventory_items_expiration_source_check
  CHECK (expiration_source IS NULL OR expiration_source IN ('user', 'default', 'foodkeeper'));
