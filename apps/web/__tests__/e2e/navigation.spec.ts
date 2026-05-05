/**
 * Bottom Navigation E2E Tests
 *
 * Verifies the persistent bottom tab navigation works correctly:
 *   1. Bottom nav is visible on all authenticated pages
 *   2. Tab navigation works (Grocery → Inventory → Analytics)
 *   3. Active tab is highlighted correctly
 *   4. Settings gear icon is accessible from all pages
 *   5. Bottom nav is NOT shown on auth pages
 */

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.test.');
}

const adminClient = createClient(supabaseUrl, supabaseKey);

test.describe('Bottom Navigation', () => {
  const testEmail = `nav-e2e-${Date.now()}@example.com`;
  const testPassword = 'SecurePassword123!';
  let testUserId: string;
  let testHouseholdId: string;

  test.beforeAll(async () => {
    const { data: user } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });

    if (!user?.user) throw new Error('Failed to create test user');
    testUserId = user.user.id;

    await adminClient.from('profiles').upsert({
      id: testUserId,
      display_name: 'Nav Tester',
      avatar_config: { style: 'adventurer', seed: 'nav-test' },
    });

    const { data: household } = await adminClient
      .from('households')
      .insert({
        name: 'Nav Test Household',
        created_by: testUserId,
      })
      .select('id')
      .single();

    if (!household) throw new Error('Failed to create household');
    testHouseholdId = household.id;

    await adminClient.from('household_members').upsert({
      household_id: testHouseholdId,
      user_id: testUserId,
      role: 'owner',
    });
  });

  test.afterAll(async () => {
    if (testHouseholdId) {
      await adminClient.from('grocery_items').delete().eq('household_id', testHouseholdId);
      await adminClient.from('inventory_items').delete().eq('household_id', testHouseholdId);
      await adminClient.from('household_members').delete().eq('household_id', testHouseholdId);
      await adminClient.from('households').delete().eq('id', testHouseholdId);
    }
    if (testUserId) {
      await adminClient.from('profiles').delete().eq('id', testUserId);
      await adminClient.auth.admin.deleteUser(testUserId);
    }
  });

  async function login(page: import('@playwright/test').Page) {
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('#login-button');

    // Wait for auth redirect — may go to dashboard, grocery, or onboarding
    await expect(page).toHaveURL(/\/(dashboard|grocery|onboarding)/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
  }

  // -----------------------------------------------------------------------
  // Tests
  // -----------------------------------------------------------------------

  test('bottom nav is NOT visible on login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('nav-tab-grocery')).not.toBeVisible();
    await expect(page.getByTestId('nav-tab-inventory')).not.toBeVisible();
    await expect(page.getByTestId('nav-tab-analytics')).not.toBeVisible();
  });

  test('bottom nav is visible on grocery page with 3 tabs', async ({ page }) => {
    await login(page);
    await page.goto('/grocery');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('nav-tab-grocery')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('nav-tab-inventory')).toBeVisible();
    await expect(page.getByTestId('nav-tab-analytics')).toBeVisible();
  });

  test('grocery tab is active on /grocery page', async ({ page }) => {
    await login(page);
    await page.goto('/grocery');
    await page.waitForLoadState('networkidle');

    const groceryTab = page.getByTestId('nav-tab-grocery');
    await expect(groceryTab).toHaveAttribute('aria-current', 'page', { timeout: 10000 });
  });

  test('navigate from grocery to inventory via bottom nav', async ({ page }) => {
    await login(page);
    await page.goto('/grocery');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('nav-tab-inventory').click();
    await expect(page).toHaveURL(/\/inventory/, { timeout: 10000 });

    // Inventory tab should now be active
    const inventoryTab = page.getByTestId('nav-tab-inventory');
    await expect(inventoryTab).toHaveAttribute('aria-current', 'page');
  });

  test('navigate from inventory to analytics via bottom nav', async ({ page }) => {
    await login(page);
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('nav-tab-analytics').click();
    await expect(page).toHaveURL(/\/analytics/, { timeout: 10000 });

    // Analytics tab should now be active
    const analyticsTab = page.getByTestId('nav-tab-analytics');
    await expect(analyticsTab).toHaveAttribute('aria-current', 'page');
  });

  test('settings gear icon navigates to dashboard', async ({ page }) => {
    await login(page);
    await page.goto('/grocery');
    await page.waitForLoadState('networkidle');

    const settingsGear = page.getByTestId('header-settings');
    await expect(settingsGear).toBeVisible({ timeout: 10000 });
    await settingsGear.click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('bottom nav is visible on dashboard page', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('nav-tab-grocery')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('nav-tab-inventory')).toBeVisible();
    await expect(page.getByTestId('nav-tab-analytics')).toBeVisible();
  });

  test('bottom nav is visible on analytics page', async ({ page }) => {
    await login(page);
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('nav-tab-grocery')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('nav-tab-inventory')).toBeVisible();
    await expect(page.getByTestId('nav-tab-analytics')).toBeVisible();
  });
});
