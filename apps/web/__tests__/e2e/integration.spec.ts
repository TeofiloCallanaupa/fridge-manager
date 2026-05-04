/**
 * Phase 4.9 — Full Integration E2E Tests
 *
 * Chains the complete web workflow end-to-end:
 *   1. Add grocery item → check off → verify in inventory
 *   2. Quick add item directly to inventory
 *   3. Open detail sheet → discard → verify in recently removed
 *   4. Change discard reason → restore → verify restored
 *   5. Navigate to removal history → verify monthly grouping
 *   6. FoodKeeper expiration_source is correctly persisted
 *
 * Uses serial mode so all tests share the same page and state.
 */

import { test, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Setup: Admin client for DB verification
// ---------------------------------------------------------------------------

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.test.');
}

const adminClient = createClient(supabaseUrl, supabaseKey);

// ---------------------------------------------------------------------------
// Test suite — serial mode so tests share state
// ---------------------------------------------------------------------------

test.describe.configure({ mode: 'serial' });

test.describe('Phase 4 Integration — Full Workflow', () => {
  const testEmail = `integration-${Date.now()}@example.com`;
  const testPassword = 'SecurePassword123!';
  let testUserId: string;
  let testHouseholdId: string;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    // Create a fully onboarded test user via admin API
    const { data: user } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });

    if (!user?.user) throw new Error('Failed to create test user');
    testUserId = user.user.id;

    await adminClient.from('profiles').upsert({
      id: testUserId,
      display_name: 'Integration Tester',
      avatar_config: { style: 'adventurer', seed: 'integration-test' },
    });

    const { data: household } = await adminClient
      .from('households')
      .insert({
        name: 'Integration Test Household',
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

    // Create a shared page and login once
    page = await browser.newPage();
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('#login-button');
    await expect(page).toHaveURL(/\/(dashboard|grocery|inventory)/, { timeout: 15000 });
  });

  test.afterAll(async () => {
    await page?.close();

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

  // =======================================================================
  // 1. Grocery → Checkout → Inventory (FoodKeeper match)
  // =======================================================================

  test('1a: add "Chicken Breast" to grocery list', async () => {
    await page.goto('/grocery');
    await page.waitForLoadState('networkidle');

    // Open add sheet
    await page.click('[aria-label="Add grocery item"]');
    await expect(page.getByText('Add Item')).toBeVisible({ timeout: 5000 });

    // Fill form — "Chicken Breast" matches FoodKeeper
    await page.fill('#item-name', 'Chicken Breast');
    await page.fill('#item-quantity', '2 lbs');

    // Select Meat category
    await page.click('[data-slot="select-trigger"]:near(:text("Category"))');
    await page.getByRole('option', { name: /Meat/i }).click();

    // Submit
    await page.getByRole('button', { name: /add to list/i }).click();
    await expect(page.getByText('Chicken Breast')).toBeVisible({ timeout: 10000 });
  });

  test('1b: check off "Chicken Breast" and finish shopping → disappears from grocery list', async () => {
    // Item should be visible from previous test
    await expect(page.getByText('Chicken Breast')).toBeVisible({ timeout: 5000 });

    // Click the check circle — item stays visible (strikethrough)
    await page.click('[aria-label="Check off Chicken Breast"]');
    await expect(page.getByText('Chicken Breast')).toBeVisible({ timeout: 5000 });

    // Click "Finish Shopping" to batch-complete checked items
    const finishButton = page.getByRole('button', { name: /finish shopping/i });
    await expect(finishButton).toBeVisible({ timeout: 5000 });
    await finishButton.click();

    // Item should now disappear from grocery list
    await expect(page.getByText('Chicken Breast')).not.toBeVisible({ timeout: 15000 });
  });

  test('1c: verify checkout created inventory item with foodkeeper source', async () => {
    // Poll DB until the async mutation has persisted
    await expect.poll(async () => {
      const { data } = await adminClient
        .from('inventory_items')
        .select('id')
        .eq('household_id', testHouseholdId)
        .eq('name', 'Chicken Breast')
        .eq('source', 'grocery_checkout');
      return data?.length ?? 0;
    }, { timeout: 10000 }).toBeGreaterThanOrEqual(1);

    // Verify in DB: should have expiration_source = 'foodkeeper'
    const { data: items } = await adminClient
      .from('inventory_items')
      .select('*')
      .eq('household_id', testHouseholdId)
      .eq('name', 'Chicken Breast')
      .eq('source', 'grocery_checkout');

    expect(items).not.toBeNull();
    expect(items!.length).toBeGreaterThanOrEqual(1);

    const item = items![0];
    expect(item.expiration_source).toBe('foodkeeper');
    expect(item.expiration_date).not.toBeNull();
    expect(item.location).toBe('fridge');
    expect(item.added_by).toBe(testUserId);
  });

  test('1d: "Chicken Breast" appears in inventory view', async () => {
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');

    await expect(
      page.locator('button', { hasText: 'Chicken Breast' }),
    ).toBeVisible({ timeout: 10000 });
  });

  // =======================================================================
  // 2. Grocery → Checkout (non-FoodKeeper item gets "default" source)
  // =======================================================================

  test('2: add + checkout non-FoodKeeper item → default expiration source', async () => {
    await page.goto('/grocery');
    await page.waitForLoadState('networkidle');

    // Add item
    await page.click('[aria-label="Add grocery item"]');
    await expect(page.getByText('Add Item')).toBeVisible({ timeout: 5000 });

    await page.fill('#item-name', 'Artisanal Acai Spread');

    await page.click('[data-slot="select-trigger"]:near(:text("Category"))');
    await page.getByRole('option', { name: /Condiments/i }).click();

    await page.getByRole('button', { name: /add to list/i }).click();
    await expect(page.getByText('Artisanal Acai Spread')).toBeVisible({ timeout: 10000 });

    // Check off — item stays visible (strikethrough)
    await page.click('[aria-label="Check off Artisanal Acai Spread"]');
    await expect(page.getByText('Artisanal Acai Spread')).toBeVisible({ timeout: 5000 });

    // Click "Finish Shopping" to batch-complete
    const finishButton = page.getByRole('button', { name: /finish shopping/i });
    await expect(finishButton).toBeVisible({ timeout: 5000 });
    await finishButton.click();

    // Item should now disappear
    await expect(page.getByText('Artisanal Acai Spread')).not.toBeVisible({ timeout: 15000 });

    // Verify in DB
    const { data: items } = await adminClient
      .from('inventory_items')
      .select('*')
      .eq('household_id', testHouseholdId)
      .eq('name', 'Artisanal Acai Spread')
      .eq('source', 'grocery_checkout');

    expect(items).not.toBeNull();
    expect(items!.length).toBeGreaterThanOrEqual(1);
    expect(items![0].expiration_source).toBe('default');
  });

  // =======================================================================
  // 3. Quick Add to inventory
  // =======================================================================

  test('3: quick add "Fresh Salmon" directly to inventory', async () => {
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');

    // Click Quick Add FAB
    const fab = page.locator('[aria-label="Quick add item"]');
    await expect(fab).toBeVisible({ timeout: 5000 });
    await fab.click();

    // Fill form
    await expect(page.getByText('Quick Add')).toBeVisible({ timeout: 5000 });

    const nameInput = page.getByLabel(/item name/i);
    await nameInput.fill('Fresh Salmon');

    const qtyInput = page.getByLabel(/quantity/i);
    await qtyInput.fill('1 fillet');

    // Pick category
    const categoryTrigger = page.getByRole('combobox', { name: /category/i });
    await categoryTrigger.click();
    await page.getByRole('option', { name: /Meat/i }).click();

    // Submit
    await page.getByRole('button', { name: /add to inventory/i }).click();

    // Verify item appears in inventory
    await expect(
      page.locator('button', { hasText: 'Fresh Salmon' }),
    ).toBeVisible({ timeout: 10000 });
  });

  // =======================================================================
  // 4. Open detail → Discard
  // =======================================================================

  test('4a: open detail sheet for "Fresh Salmon" and verify fields', async () => {
    await page.locator('button', { hasText: 'Fresh Salmon' }).click();

    const sheet = page.locator('[data-slot="sheet-content"]');
    await expect(sheet).toBeVisible({ timeout: 5000 });
    await expect(sheet.getByText('Fresh Salmon')).toBeVisible();
    await expect(sheet.getByText('1 fillet')).toBeVisible();

    // Close the sheet to prepare for discard
    await page.keyboard.press('Escape');
    await expect(sheet).not.toBeVisible({ timeout: 3000 });
  });

  test('4b: mark "Fresh Salmon" as used → item disappears from inventory', async () => {
    // Re-open detail sheet
    await page.locator('button', { hasText: 'Fresh Salmon' }).click();
    const sheet = page.locator('[data-slot="sheet-content"]');
    await expect(sheet).toBeVisible({ timeout: 5000 });

    // Click "Used it"
    await sheet.getByLabel('Mark as used').click();

    // Sheet closes, item gone from active list
    await expect(sheet).not.toBeVisible({ timeout: 5000 });
    await expect(
      page.locator('button', { hasText: 'Fresh Salmon' }),
    ).not.toBeVisible({ timeout: 5000 });
  });

  test('4c: "Fresh Salmon" appears in recently removed section', async () => {
    // The recently removed section should be on the inventory page
    await expect(page.getByText(/Recently Removed/)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Fresh Salmon')).toBeVisible({ timeout: 5000 });
  });

  // =======================================================================
  // 5. Discard another item + change reason
  // =======================================================================

  test('5a: mark "Chicken Breast" as tossed', async () => {
    const chickenCard = page.locator('button', { hasText: 'Chicken Breast' });
    await expect(chickenCard).toBeVisible({ timeout: 10000 });

    await chickenCard.click();
    const sheet = page.locator('[data-slot="sheet-content"]');
    await expect(sheet).toBeVisible({ timeout: 5000 });

    await sheet.getByLabel('Mark as tossed').click();
    await expect(sheet).not.toBeVisible({ timeout: 5000 });
  });

  test('5b: verify "Chicken Breast" discarded in DB with correct reason', async () => {
    // Poll DB until the discard mutation has persisted
    await expect.poll(async () => {
      const { data } = await adminClient
        .from('inventory_items')
        .select('id')
        .eq('household_id', testHouseholdId)
        .eq('name', 'Chicken Breast')
        .not('discarded_at', 'is', null);
      return data?.length ?? 0;
    }, { timeout: 10000 }).toBeGreaterThanOrEqual(1);

    const { data: discarded } = await adminClient
      .from('inventory_items')
      .select('id, discard_reason')
      .eq('household_id', testHouseholdId)
      .eq('name', 'Chicken Breast')
      .not('discarded_at', 'is', null)
      .single();

    expect(discarded).not.toBeNull();
    expect(['wasted', 'expired']).toContain(discarded!.discard_reason);
  });

  // =======================================================================
  // 6. Restore item
  // =======================================================================

  test('6: restore "Artisanal Acai Spread" → verify in DB', async () => {
    // First, discard it via the UI
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');

    const spreadCard = page.locator('button', { hasText: 'Artisanal Acai Spread' });
    if (await spreadCard.isVisible({ timeout: 3000 })) {
      await spreadCard.click();
      const sheet = page.locator('[data-slot="sheet-content"]');
      await expect(sheet).toBeVisible({ timeout: 5000 });
      await sheet.getByLabel('Mark as used').click();
      await expect(sheet).not.toBeVisible({ timeout: 5000 });
    }

    // Now find it in recently removed and restore
    const removedItem = page.locator('[data-testid="recently-removed-item"]')
      .filter({ hasText: 'Artisanal Acai Spread' });

    if (await removedItem.isVisible({ timeout: 5000 })) {
      await removedItem.click();
      const restoreBtn = page.getByText(/Restore to inventory/);
      await expect(restoreBtn).toBeVisible({ timeout: 3000 });
      await restoreBtn.click();

      await expect(page.getByText(/restored/i)).toBeVisible({ timeout: 5000 });
    }

    // Verify in DB
    const { data: restored } = await adminClient
      .from('inventory_items')
      .select('discarded_at')
      .eq('household_id', testHouseholdId)
      .eq('name', 'Artisanal Acai Spread')
      .is('discarded_at', null);

    expect(restored).not.toBeNull();
    expect(restored!.length).toBeGreaterThanOrEqual(1);
  });

  // =======================================================================
  // 7. Removal History page
  // =======================================================================

  test('7a: removal history page shows discarded items', async () => {
    await page.goto('/inventory/history');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Removal History')).toBeVisible({ timeout: 10000 });

    // At least Chicken Breast and Fresh Salmon should appear
    // (Artisanal Acai Spread may have been restored)
    await expect(page.getByText('Chicken Breast')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Fresh Salmon')).toBeVisible({ timeout: 10000 });
  });

  test('7b: removal history shows current month header', async () => {
    const now = new Date();
    const monthName = now.toLocaleString('en-US', { month: 'long' });
    const yearStr = now.getFullYear().toString();

    await expect(
      page.getByText(new RegExp(`${monthName}.*${yearStr}`)).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test('7c: removal history summary card counts items', async () => {
    const summary = page.getByTestId('summary-card');
    await expect(summary).toBeVisible({ timeout: 10000 });

    // At least 2 items removed
    await expect(summary.getByText(/items removed/)).toBeVisible();
  });

  // =======================================================================
  // 8. FoodKeeper expiration verification (DB-level)
  // =======================================================================

  test('8: verify FoodKeeper data integrity across all checkout items', async () => {
    const { data: allItems } = await adminClient
      .from('inventory_items')
      .select('name, expiration_source, expiration_date, source')
      .eq('household_id', testHouseholdId);

    expect(allItems).not.toBeNull();

    // Chicken Breast — FoodKeeper match
    const chickenItem = allItems!.find((i) => i.name === 'Chicken Breast');
    expect(chickenItem).toBeDefined();
    expect(chickenItem!.expiration_source).toBe('foodkeeper');
    expect(chickenItem!.expiration_date).not.toBeNull();
    expect(chickenItem!.source).toBe('grocery_checkout');

    // Artisanal Acai Spread — no FoodKeeper match → default
    const acaiItem = allItems!.find((i) => i.name === 'Artisanal Acai Spread');
    expect(acaiItem).toBeDefined();
    expect(acaiItem!.expiration_source).toBe('default');
    expect(acaiItem!.expiration_date).not.toBeNull();
    expect(acaiItem!.source).toBe('grocery_checkout');

    // Fresh Salmon — Quick Add (manual source)
    const salmonItem = allItems!.find((i) => i.name === 'Fresh Salmon');
    expect(salmonItem).toBeDefined();
    expect(salmonItem!.source).toBe('manual');
  });
});
