-- ==========================================================================
-- Seed Data: Test User for Local Development
-- ==========================================================================
-- This file is run automatically on `supabase db reset`.
-- It creates a fully onboarded test user so you can immediately log in
-- and interact with the app without going through signup/onboarding.
--
-- Credentials (also documented in docs/test-credentials.md):
--   Email:    dev@fridgemanager.test
--   Password: TestPassword123!
-- ==========================================================================

-- 1. Create auth user via Supabase's internal auth schema.
--    The UUID is fixed so we can reference it in subsequent inserts.
--    All string columns that GoTrue scans must be '' not NULL, otherwise
--    login will fail with "Database error querying schema".
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_current,
  email_change_token_new,
  email_change_confirm_status,
  phone,
  phone_change,
  phone_change_token,
  reauthentication_token,
  is_sso_user,
  is_anonymous
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'dev@fridgemanager.test',
  -- Generate bcrypt hash at seed time using pgcrypto (always compatible)
  crypt('TestPassword123!', gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}',
  jsonb_build_object(
    'sub', '00000000-0000-0000-0000-000000000001',
    'email', 'dev@fridgemanager.test',
    'email_verified', true,
    'phone_verified', false
  ),
  'authenticated',
  'authenticated',
  now(),
  now(),
  '',   -- confirmation_token
  '',   -- recovery_token
  '',   -- email_change
  '',   -- email_change_token_current
  '',   -- email_change_token_new
  0,    -- email_change_confirm_status
  NULL, -- phone
  '',   -- phone_change
  '',   -- phone_change_token
  '',   -- reauthentication_token
  false,-- is_sso_user
  false -- is_anonymous
) ON CONFLICT (id) DO NOTHING;

-- 1b. Create the identity record (required for email/password login)
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  provider,
  identity_data,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'email',
  jsonb_build_object(
    'sub', '00000000-0000-0000-0000-000000000001',
    'email', 'dev@fridgemanager.test',
    'email_verified', true,
    'phone_verified', false
  ),
  now(),
  now(),
  now()
) ON CONFLICT (provider_id, provider) DO NOTHING;

-- 2. Create/update profile (fully onboarded)
--    The auth trigger creates a bare profile; we update it with display_name + avatar.
INSERT INTO profiles (id, display_name, avatar_config)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Dev Tester',
  '{"style": "adventurer", "seed": "dev-tester"}'
) ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  avatar_config = EXCLUDED.avatar_config;

-- 3. Create household
INSERT INTO households (id, name, created_by)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  'Dev Household',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- 4. Assign user as household owner
INSERT INTO household_members (household_id, user_id, role)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'owner'
) ON CONFLICT (household_id, user_id) DO NOTHING;

-- 5. Add some sample inventory items for visual testing
DO $$
DECLARE
  v_produce_id uuid;
  v_dairy_id   uuid;
  v_meat_id    uuid;
BEGIN
  SELECT id INTO v_produce_id FROM categories WHERE name = 'produce' LIMIT 1;
  SELECT id INTO v_dairy_id   FROM categories WHERE name = 'dairy' LIMIT 1;
  SELECT id INTO v_meat_id    FROM categories WHERE name = 'meat' LIMIT 1;

  -- Only insert if there are no items yet (idempotent)
  IF NOT EXISTS (
    SELECT 1 FROM inventory_items
    WHERE household_id = '00000000-0000-0000-0000-000000000010'
  ) THEN
    -- Fridge items
    INSERT INTO inventory_items (name, quantity, category_id, location, household_id, added_by, source, expiration_date, expiration_source)
    VALUES
      ('Strawberries', '1 lb', v_produce_id, 'fridge', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'manual', (CURRENT_DATE + interval '2 days')::date, 'user'),
      ('Whole Milk', '1 gallon', v_dairy_id, 'fridge', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'manual', (CURRENT_DATE + interval '5 days')::date, 'user'),
      ('Chicken Breast', '2 lbs', v_meat_id, 'fridge', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'manual', (CURRENT_DATE + interval '1 day')::date, 'user'),
      ('Baby Spinach', '1 bag', v_produce_id, 'fridge', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'manual', (CURRENT_DATE - interval '1 day')::date, 'user');

    -- Freezer item
    INSERT INTO inventory_items (name, quantity, category_id, location, household_id, added_by, source, expiration_date, expiration_source)
    VALUES
      ('Frozen Pizza', '2', v_dairy_id, 'freezer', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'manual', (CURRENT_DATE + interval '30 days')::date, 'user');

    -- Pantry item (no expiration)
    INSERT INTO inventory_items (name, quantity, category_id, location, household_id, added_by, source)
    VALUES
      ('Brown Rice', '2 lbs', v_produce_id, 'pantry', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'manual');
  END IF;
END $$;
