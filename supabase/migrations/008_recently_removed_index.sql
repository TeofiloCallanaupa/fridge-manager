-- Performance index for the "Recently Removed" feed query.
-- The existing indexes filter WHERE discarded_at IS NULL (active items).
-- This partial index covers the opposite: discarded items, sorted by recency.

CREATE INDEX idx_inventory_items_recently_removed
  ON inventory_items (household_id, discarded_at DESC)
  WHERE discarded_at IS NOT NULL;
