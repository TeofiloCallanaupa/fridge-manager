import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Setup: Admin client + test user with discarded inventory items
// ---------------------------------------------------------------------------

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.test.');
}

const adminClient = createClient(supabaseUrl, supabaseKey);

test.describe('Removal History Page', () => {
  const testEmail = `history-e2e-${Date.now()}@example.com`;
  const testPassword = 'SecurePassword123!';
  let testUserId: string;
  let testHouseholdId: string;
  let categoryId: string;
  let consumedItemId: string;
  let wastedItemId: string;
  let expiredItemId: string;

  test.beforeAll(async () => {
    // Create fully onboarded test user
    const { data: user } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });

    if (!user?.user) throw new Error('Failed to create test user');
    testUserId = user.user.id;

    await adminClient.from('profiles').upsert({
      id: testUserId,
      display_name: 'History Tester',
      avatar_config: { style: 'adventurer', seed: 'hist-test' },
    });

    // Create household
    const { data: household } = await adminClient
      .from('households')
      .insert({
        name: 'History Test Household',
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

    // Get a category
    const { data: cats } = await adminClient
      .from('categories')
      .select('id, name')
      .limit(1)
      .single();
    categoryId = cats!.id;

    // Insert discarded items across multiple days in the current month
    // Use dates relative to today but CLAMPED to current month to avoid
    // cross-month boundary issues (e.g. May 2 → 2 days ago = April 30)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();

    // All items must be in the current month
    const todayDate = new Date(currentYear, currentMonth, currentDay, 12, 0, 0);
    const dayBefore = currentDay >= 2
      ? new Date(currentYear, currentMonth, currentDay - 1, 12, 0, 0)
      : todayDate; // fallback to today if 1st of month
    const twoBefore = currentDay >= 3
      ? new Date(currentYear, currentMonth, currentDay - 2, 12, 0, 0)
      : todayDate; // fallback to today if 1st or 2nd

    // Consumed item (today)
    const { data: consumed } = await adminClient
      .from('inventory_items')
      .insert({
        name: 'E2E Chicken breast',
        quantity: '1 lb',
        category_id: categoryId,
        location: 'fridge',
        household_id: testHouseholdId,
        added_by: testUserId,
        source: 'manual',
        discarded_at: todayDate.toISOString(),
        discard_reason: 'consumed',
      })
      .select('id')
      .single();
    consumedItemId = consumed!.id;

    // Wasted item (yesterday)
    const { data: wasted } = await adminClient
      .from('inventory_items')
      .insert({
        name: 'E2E Greek yogurt',
        quantity: '2 cups',
        category_id: categoryId,
        location: 'fridge',
        household_id: testHouseholdId,
        added_by: testUserId,
        source: 'manual',
        discarded_at: dayBefore.toISOString(),
        discard_reason: 'wasted',
      })
      .select('id')
      .single();
    wastedItemId = wasted!.id;

    // Expired item (2 days ago)
    const { data: expired } = await adminClient
      .from('inventory_items')
      .insert({
        name: 'E2E Baby spinach',
        quantity: '1 bag',
        category_id: categoryId,
        location: 'fridge',
        household_id: testHouseholdId,
        added_by: testUserId,
        source: 'manual',
        discarded_at: twoBefore.toISOString(),
        discard_reason: 'expired',
      })
      .select('id')
      .single();
    expiredItemId = expired!.id;
  });

  test.afterAll(async () => {
    if (testHouseholdId) {
      await adminClient.from('inventory_items').delete().eq('household_id', testHouseholdId);
      await adminClient.from('household_members').delete().eq('household_id', testHouseholdId);
      await adminClient.from('households').delete().eq('id', testHouseholdId);
    }
    if (testUserId) {
      await adminClient.from('profiles').delete().eq('id', testUserId);
      await adminClient.auth.admin.deleteUser(testUserId);
    }
  });

  // Helper: login and go to history page
  async function loginAndNavigate(page: import('@playwright/test').Page) {
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('#login-button');
    await expect(page).toHaveURL(/\/(dashboard|inventory|grocery)/, { timeout: 15000 });
    await page.goto('/inventory/history');
    await page.waitForLoadState('networkidle');
  }

  // -----------------------------------------------------------------------
  // Page loads + layout
  // -----------------------------------------------------------------------

  test('history page requires auth — unauthenticated redirects to login', async ({ page }) => {
    await page.goto('/inventory/history');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('history page loads with title and back link', async ({ page }) => {
    await loginAndNavigate(page);

    await expect(page.getByText('Removal History')).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel(/back to inventory/i)).toBeVisible();
  });

  test('back link navigates to inventory page', async ({ page }) => {
    await loginAndNavigate(page);

    const backLink = page.getByLabel(/back to inventory/i);
    await expect(backLink).toBeVisible({ timeout: 10000 });
    await backLink.click();

    await expect(page).toHaveURL(/\/inventory$/, { timeout: 10000 });
  });

  // -----------------------------------------------------------------------
  // Month navigation
  // -----------------------------------------------------------------------

  test('displays current month and year in header', async ({ page }) => {
    await loginAndNavigate(page);

    const now = new Date();
    const monthName = now.toLocaleString('en-US', { month: 'long' });
    const yearStr = now.getFullYear().toString();

    await expect(
      page.getByText(new RegExp(`${monthName}.*${yearStr}`)).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test('previous month button navigates to prior month', async ({ page }) => {
    await loginAndNavigate(page);

    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthName = prevMonth.toLocaleString('en-US', { month: 'long' });

    const prevButton = page.getByLabel(/previous month/i);
    await expect(prevButton).toBeVisible({ timeout: 10000 });
    await prevButton.click();

    await expect(
      page.getByText(new RegExp(prevMonthName)).first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test('month chips highlight the active month', async ({ page }) => {
    await loginAndNavigate(page);

    const now = new Date();
    const shortMonth = now.toLocaleString('en-US', { month: 'short' });

    // Active chip should have the green background class
    const activeChip = page.getByRole('tab', { selected: true });
    await expect(activeChip).toBeVisible({ timeout: 10000 });
    await expect(activeChip).toHaveText(shortMonth);
  });

  // -----------------------------------------------------------------------
  // Summary card
  // -----------------------------------------------------------------------

  test('summary card displays correct counts per reason', async ({ page }) => {
    await loginAndNavigate(page);

    const summary = page.getByTestId('summary-card');
    await expect(summary).toBeVisible({ timeout: 10000 });

    // 1 consumed, 1 wasted, 1 expired = 3 total
    // Text format is "{N} items removed · {Month} {Year}"
    await expect(summary.getByText(/3 items removed/)).toBeVisible();
    await expect(summary.getByText('Used')).toBeVisible();
    await expect(summary.getByText('Wasted')).toBeVisible();
    await expect(summary.getByText('Expired')).toBeVisible();
  });

  // -----------------------------------------------------------------------
  // Daily grouped list
  // -----------------------------------------------------------------------

  test('renders items grouped by day with day headers', async ({ page }) => {
    await loginAndNavigate(page);

    // Wait for items to load
    await expect(page.getByText('E2E Chicken breast')).toBeVisible({ timeout: 10000 });

    // Day headers should exist
    const dayHeaders = page.getByTestId('day-header');
    const count = await dayHeaders.count();
    expect(count).toBeGreaterThanOrEqual(2); // at least today + yesterday

    // All 3 items should be visible
    await expect(page.getByText('E2E Chicken breast')).toBeVisible();
    await expect(page.getByText('E2E Greek yogurt')).toBeVisible();
    await expect(page.getByText('E2E Baby spinach')).toBeVisible();
  });

  test('items display the user who discarded them', async ({ page }) => {
    await loginAndNavigate(page);

    await expect(page.getByText('E2E Chicken breast')).toBeVisible({ timeout: 10000 });

    // Should show "by History Tester" for at least one item
    const byText = page.getByText(/by History Tester/);
    const count = await byText.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('items display reason chips (Used, Wasted, Expired)', async ({ page }) => {
    await loginAndNavigate(page);

    await expect(page.getByText('E2E Chicken breast')).toBeVisible({ timeout: 10000 });

    // Reason chips should be visible
    const usedChips = page.locator('[data-testid="history-item-card"]').getByText('Used');
    await expect(usedChips.first()).toBeVisible();

    const wastedChips = page.locator('[data-testid="history-item-card"]').getByText('Wasted');
    await expect(wastedChips.first()).toBeVisible();

    const expiredChips = page.locator('[data-testid="history-item-card"]').getByText('Expired');
    await expect(expiredChips.first()).toBeVisible();
  });

  // -----------------------------------------------------------------------
  // Correction actions
  // -----------------------------------------------------------------------

  test('tapping a card expands correction panel', async ({ page }) => {
    await loginAndNavigate(page);

    const card = page
      .getByTestId('history-item-card')
      .filter({ hasText: 'E2E Chicken breast' });
    await expect(card).toBeVisible({ timeout: 10000 });

    await card.click();

    // Correction options should appear
    await expect(page.getByText(/Change to/)).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/Restore to inventory/)).toBeVisible();
  });

  test('tapping expanded card collapses correction panel', async ({ page }) => {
    await loginAndNavigate(page);

    const card = page
      .getByTestId('history-item-card')
      .filter({ hasText: 'E2E Chicken breast' });
    await expect(card).toBeVisible({ timeout: 10000 });

    // Expand
    await card.click();
    await expect(page.getByText(/Change to/)).toBeVisible({ timeout: 3000 });

    // Collapse
    await card.click();
    await expect(page.getByText(/Change to/)).not.toBeVisible({ timeout: 3000 });
  });

  test('change reason updates the item chip', async ({ page }) => {
    await loginAndNavigate(page);

    // Click the consumed item
    const card = page
      .getByTestId('history-item-card')
      .filter({ hasText: 'E2E Chicken breast' });
    await expect(card).toBeVisible({ timeout: 10000 });
    await card.click();

    // Click "Change to Tossed"
    const changeButton = page.getByText(/Change to Tossed/);
    await expect(changeButton).toBeVisible({ timeout: 3000 });
    await changeButton.click();

    // Toast should appear
    await expect(page.getByText(/Reason updated/)).toBeVisible({ timeout: 5000 });

    // Verify in DB that reason changed
    const { data: updated } = await adminClient
      .from('inventory_items')
      .select('discard_reason')
      .eq('id', consumedItemId)
      .single();

    expect(updated!.discard_reason).toBe('wasted');

    // Reset back for other tests
    await adminClient
      .from('inventory_items')
      .update({ discard_reason: 'consumed' })
      .eq('id', consumedItemId);
  });

  test('restore returns item to active inventory', async ({ page }) => {
    // Create a temporary item to restore
    const { data: tempItem } = await adminClient
      .from('inventory_items')
      .insert({
        name: 'E2E Restore test item',
        quantity: '1',
        category_id: categoryId,
        location: 'pantry',
        household_id: testHouseholdId,
        added_by: testUserId,
        source: 'manual',
        discarded_at: new Date().toISOString(),
        discard_reason: 'consumed',
      })
      .select('id')
      .single();

    await loginAndNavigate(page);

    // Click the temp item
    const card = page
      .getByTestId('history-item-card')
      .filter({ hasText: 'E2E Restore test item' });
    await expect(card).toBeVisible({ timeout: 10000 });
    await card.click();

    // Click restore
    const restoreButton = page.getByText(/Restore to inventory/);
    await expect(restoreButton).toBeVisible({ timeout: 3000 });
    await restoreButton.click();

    // Toast
    await expect(page.getByText(/Item restored to inventory/)).toBeVisible({ timeout: 5000 });

    // Verify in DB: discarded_at should be null
    const { data: restored } = await adminClient
      .from('inventory_items')
      .select('discarded_at, discard_reason')
      .eq('id', tempItem!.id)
      .single();

    expect(restored!.discarded_at).toBeNull();
    expect(restored!.discard_reason).toBeNull();

    // Cleanup: delete the restored item
    await adminClient.from('inventory_items').delete().eq('id', tempItem!.id);
  });

  // -----------------------------------------------------------------------
  // Empty state
  // -----------------------------------------------------------------------

  test('empty month shows placeholder', async ({ page }) => {
    await loginAndNavigate(page);

    // Navigate to a month we know has no data (far future)
    // Click next month button multiple times
    const nextButton = page.getByLabel(/next month/i);
    await expect(nextButton).toBeVisible({ timeout: 10000 });
    await nextButton.click();
    await nextButton.click();
    await nextButton.click();

    // Empty state should appear
    await expect(page.getByText(/Nothing removed this month/)).toBeVisible({ timeout: 5000 });
  });

  // -----------------------------------------------------------------------
  // RLS — household isolation
  // -----------------------------------------------------------------------

  test('user cannot see items from another household', async ({ page }) => {
    // Create a second user + household with their own discarded item
    const otherEmail = `history-other-${Date.now()}@example.com`;
    const { data: otherUser } = await adminClient.auth.admin.createUser({
      email: otherEmail,
      password: testPassword,
      email_confirm: true,
    });

    const otherUserId = otherUser!.user!.id;

    await adminClient.from('profiles').upsert({
      id: otherUserId,
      display_name: 'Other User',
      avatar_config: { style: 'adventurer', seed: 'other' },
    });

    const { data: otherHousehold } = await adminClient
      .from('households')
      .insert({ name: 'Other Household', created_by: otherUserId })
      .select('id')
      .single();

    await adminClient.from('household_members').upsert({
      household_id: otherHousehold!.id,
      user_id: otherUserId,
      role: 'owner',
    });

    await adminClient.from('inventory_items').insert({
      name: 'SECRET other household item',
      quantity: '1',
      category_id: categoryId,
      location: 'fridge',
      household_id: otherHousehold!.id,
      added_by: otherUserId,
      source: 'manual',
      discarded_at: new Date().toISOString(),
      discard_reason: 'consumed',
    });

    // Login as our test user and go to history
    await loginAndNavigate(page);

    // Wait for our items to load
    await expect(page.getByText('E2E Chicken breast')).toBeVisible({ timeout: 10000 });

    // The secret item should NOT be visible
    await expect(page.getByText('SECRET other household item')).not.toBeVisible();

    // Cleanup
    await adminClient.from('inventory_items').delete().eq('household_id', otherHousehold!.id);
    await adminClient.from('household_members').delete().eq('household_id', otherHousehold!.id);
    await adminClient.from('households').delete().eq('id', otherHousehold!.id);
    await adminClient.from('profiles').delete().eq('id', otherUserId);
    await adminClient.auth.admin.deleteUser(otherUserId);
  });
});
