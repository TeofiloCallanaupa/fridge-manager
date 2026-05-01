import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

// ---------------------------------------------------------------------------
// Setup: Admin client + test user creation
// ---------------------------------------------------------------------------

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseKey) {
  try {
    const statusJson = execSync('npx supabase status -o json', { encoding: 'utf-8' });
    const status = JSON.parse(statusJson);
    supabaseKey = status.SERVICE_ROLE_KEY;
  } catch (e) {
    console.warn('Could not fetch Supabase status. Make sure Supabase is running locally.');
  }
}

const adminClient = createClient(supabaseUrl, supabaseKey);

test.describe('Grocery List Flows', () => {
  const testEmail = `grocery-e2e-${Date.now()}@example.com`;
  const testPassword = 'SecurePassword123!';
  let testUserId: string;
  let testHouseholdId: string;

  test.beforeAll(async () => {
    // Create fully onboarded test user
    const { data: user } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });

    if (!user?.user) throw new Error('Failed to create test user');
    testUserId = user.user.id;

    // Create profile
    await adminClient.from('profiles').upsert({
      id: testUserId,
      display_name: 'Grocery Tester',
      avatar_config: { style: 'adventurer', seed: 'grocery-test' },
    });

    // Create household
    const { data: household } = await adminClient.from('households').insert({
      name: 'Grocery Test Household',
      created_by: testUserId,
    }).select('id').single();

    if (!household) throw new Error('Failed to create household');
    testHouseholdId = household.id;

    // Add user to household
    await adminClient.from('household_members').upsert({
      household_id: testHouseholdId,
      user_id: testUserId,
      role: 'owner',
    });
  });

  test.afterAll(async () => {
    // Cleanup: remove test data
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

  // Helper: login and navigate to grocery page
  async function loginAndNavigate(page: import('@playwright/test').Page) {
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('#login-button');

    // Wait for auth redirect to complete
    await expect(page).toHaveURL(/\/(dashboard|grocery)/, { timeout: 15000 });

    // Navigate to grocery
    await page.goto('/grocery');
    await page.waitForLoadState('networkidle');
  }

  // -----------------------------------------------------------------------
  // Tests
  // -----------------------------------------------------------------------

  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/grocery');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('shows empty state for new household', async ({ page }) => {
    await loginAndNavigate(page);

    await expect(page.getByText('Your list is empty')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/grocery list/i)).toBeVisible();
  });

  test('opens add-item sheet from FAB', async ({ page }) => {
    await loginAndNavigate(page);

    // Click the FAB
    await page.click('[aria-label="Add grocery item"]');

    // Sheet should appear
    await expect(page.getByText('Add Item')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Item name')).toBeVisible();
    await expect(page.getByText('Category')).toBeVisible();
    await expect(page.getByText('Goes to')).toBeVisible();
  });

  test('validates required fields — cannot submit without name and category', async ({ page }) => {
    await loginAndNavigate(page);

    await page.click('[aria-label="Add grocery item"]');
    await expect(page.getByText('Add Item')).toBeVisible({ timeout: 5000 });

    // Submit button should be disabled initially
    const submitButton = page.getByRole('button', { name: /add to list/i });
    await expect(submitButton).toBeDisabled();
  });

  test('adds item and shows it in correct category group', async ({ page }) => {
    await loginAndNavigate(page);

    // Open the add sheet
    await page.click('[aria-label="Add grocery item"]');
    await expect(page.getByText('Add Item')).toBeVisible({ timeout: 5000 });

    // Fill in the form
    await page.fill('#item-name', 'Organic Strawberries');
    await page.fill('#item-quantity', '2 lbs');

    // Select category — click the trigger, then the option
    await page.click('[data-slot="select-trigger"]:near(:text("Category"))');
    await page.getByRole('option', { name: /Produce/i }).click();

    // Submit
    const submitButton = page.getByRole('button', { name: /add to list/i });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Verify item appears in the list
    await expect(page.getByText('Organic Strawberries')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('(2 lbs)')).toBeVisible();

    // Verify it's under the Produce category header
    await expect(page.getByText('Produce')).toBeVisible();
  });

  test('check-off marks item as checked with visual feedback', async ({ page }) => {
    await loginAndNavigate(page);

    // The item from the previous test should exist
    // Wait for it to appear
    await expect(page.getByText('Organic Strawberries')).toBeVisible({ timeout: 10000 });

    // Click the check circle
    await page.click('[aria-label="Check off Organic Strawberries"]');

    // The item should show as checked (line-through styling)
    // Wait for the animation and mutation to complete
    await expect(page.locator('.line-through:has-text("Organic Strawberries")')).toBeVisible({ timeout: 10000 });
  });

  test('check-off creates inventory_item with correct data', async ({ page }) => {
    // Verify the inventory item was created in the database
    const { data: inventoryItems } = await adminClient
      .from('inventory_items')
      .select('*')
      .eq('household_id', testHouseholdId)
      .eq('name', 'Organic Strawberries')
      .eq('source', 'grocery_checkout');

    expect(inventoryItems).not.toBeNull();
    expect(inventoryItems!.length).toBeGreaterThanOrEqual(1);

    const item = inventoryItems![0];
    expect(item.location).toBe('fridge');
    expect(item.source).toBe('grocery_checkout');
    expect(item.added_by).toBe(testUserId);
  });

  test('adds household item with destination=none and no inventory creation', async ({ page }) => {
    await loginAndNavigate(page);

    // Open add sheet
    await page.click('[aria-label="Add grocery item"]');
    await expect(page.getByText('Add Item')).toBeVisible({ timeout: 5000 });

    // Fill form with household item
    await page.fill('#item-name', 'Paper Towels');

    // Select Household category
    await page.click('[data-slot="select-trigger"]:near(:text("Category"))');
    await page.getByRole('option', { name: /Household/i }).click();

    // Destination should auto-switch to 'none' (from category default)
    // Select it explicitly to be sure
    await page.click('[data-slot="select-trigger"]:near(:text("Goes to"))');
    await page.getByRole('option', { name: /None/i }).click();

    // Submit
    await page.getByRole('button', { name: /add to list/i }).click();

    // Item should appear
    await expect(page.getByText('Paper Towels')).toBeVisible({ timeout: 10000 });

    // Check it off
    await page.click('[aria-label="Check off Paper Towels"]');

    // Wait for completion
    await expect(page.locator('.line-through:has-text("Paper Towels")')).toBeVisible({ timeout: 10000 });

    // Verify NO inventory item was created for household items
    const { data: inventoryItems } = await adminClient
      .from('inventory_items')
      .select('*')
      .eq('household_id', testHouseholdId)
      .eq('name', 'Paper Towels');

    expect(inventoryItems).not.toBeNull();
    expect(inventoryItems!.length).toBe(0);
  });

  test('delete removes item from list', async ({ page }) => {
    await loginAndNavigate(page);

    // Add a fresh item to delete
    await page.click('[aria-label="Add grocery item"]');
    await expect(page.getByText('Add Item')).toBeVisible({ timeout: 5000 });

    await page.fill('#item-name', 'Item To Delete');
    await page.click('[data-slot="select-trigger"]:near(:text("Category"))');
    await page.getByRole('option', { name: /Produce/i }).click();
    await page.getByRole('button', { name: /add to list/i }).click();

    await expect(page.getByText('Item To Delete')).toBeVisible({ timeout: 10000 });

    // Long-press or hover to reveal delete (use hover for desktop)
    const itemCard = page.locator(':has-text("Item To Delete")').first();
    await itemCard.hover();

    // Click delete
    await page.click('[aria-label="Delete Item To Delete"]');

    // Verify item is gone
    await expect(page.getByText('Item To Delete')).not.toBeVisible({ timeout: 10000 });
  });

  test('sync status badge is visible', async ({ page }) => {
    await loginAndNavigate(page);

    // Should show synced status
    await expect(page.getByText(/synced/i)).toBeVisible({ timeout: 10000 });
  });
});
