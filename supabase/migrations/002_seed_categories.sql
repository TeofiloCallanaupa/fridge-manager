-- =============================================================================
-- 002_seed_categories.sql
-- Fridge Manager — Seed data for categories and default shelf days
--
-- Uses ON CONFLICT DO NOTHING for idempotent re-runs.
-- See docs/architecture.md for full seed data documentation.
-- =============================================================================

-- =============================================================================
-- 1. CATEGORIES
-- Global reference table — 10 food/household categories.
-- =============================================================================

INSERT INTO categories (name, emoji, display_order, default_destination, has_expiration) VALUES
  ('produce',    '🥬', 1,  'fridge',  true),
  ('dairy',      '🥛', 2,  'fridge',  true),
  ('meat',       '🥩', 3,  'fridge',  true),
  ('bakery',     '🍞', 4,  'pantry',  true),
  ('frozen',     '🧊', 5,  'freezer', true),
  ('snacks',     '🍿', 6,  'pantry',  true),
  ('beverages',  '🥤', 7,  'fridge',  true),
  ('condiments', '🧂', 8,  'pantry',  true),
  ('leftovers',  '🍲', 9,  'fridge',  true),
  ('household',  '🧹', 10, 'none',    false)
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- 2. DEFAULT SHELF DAYS
-- Smart defaults for expiration dates by category + storage location.
-- References categories by name via subquery (UUIDs are non-deterministic).
-- =============================================================================

INSERT INTO default_shelf_days (category_id, location, shelf_days)
SELECT c.id, v.location, v.shelf_days
FROM (VALUES
  ('produce',    'fridge',  5),
  ('produce',    'freezer', 180),
  ('dairy',      'fridge',  7),
  ('dairy',      'freezer', 90),
  ('meat',       'fridge',  3),
  ('meat',       'freezer', 120),
  ('leftovers',  'fridge',  4),
  ('leftovers',  'freezer', 90),
  ('bakery',     'pantry',  7),
  ('bakery',     'freezer', 90),
  ('frozen',     'freezer', 180),
  ('snacks',     'pantry',  90),
  ('beverages',  'fridge',  14),
  ('condiments', 'fridge',  180),
  ('condiments', 'pantry',  365)
) AS v(category_name, location, shelf_days)
JOIN categories c ON c.name = v.category_name
ON CONFLICT (category_id, location) DO NOTHING;
