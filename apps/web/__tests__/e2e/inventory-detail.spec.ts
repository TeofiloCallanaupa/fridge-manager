import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Setup: Admin client + test user with inventory items
// ---------------------------------------------------------------------------

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.test.');
}

const adminClient = createClient(supabaseUrl, supabaseKey);

test.describe('Inventory Detail Sheet', () => {
  const testEmail = `inv-detail-${Date.now()}@example.com`;
  const testPassword = 'SecurePassword123!';
  let testUserId: string;
  let testHouseholdId: string;
  let categoryId: string;

  test.beforeAll(async () => {
    // Create fully onboarded test user
    const { data: user } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });

    if (!user?.user) throw new Error('Failed to create test user');
    testUserId = user.user.id;

    // Set display name on profile
    await adminClient.from('profiles').upsert({
      id: testUserId,
      display_name: 'Inventory Tester',
      avatar_config: { style: 'adventurer', seed: 'inv-test' },
    });

    // Create household
    const { data: household } = await adminClient.from('households').insert({
      name: 'Inventory Test Household',
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

    // Get a category for test items
    const { data: cats } = await adminClient
      .from('categories')
      .select('id, name')
      .limit(1)
      .single();
    categoryId = cats!.id;

    // Insert an inventory item
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + 5);
    await adminClient.from('inventory_items').insert({
      name: 'Salmon fillet',
      quantity: '1 lb',
      category_id: categoryId,
      location: 'fridge',
      household_id: testHouseholdId,
      added_by: testUserId,
      source: 'manual',
      expiration_date: expDate.toISOString().split('T')[0],
      expiration_source: 'default',
    });

    // Insert completed grocery items for purchase history
    for (let i = 0; i < 4; i++) {
      await adminClient.from('grocery_items').insert({
        name: 'Salmon fillet',
        household_id: testHouseholdId,
        added_by: testUserId,
        category_id: categoryId,
        destination: 'fridge',
        completed_at: new Date(Date.now() - i * 7 * 86400000).toISOString(),
      });
    }
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

  // Helper: login and go to inventory
  async function loginAndNavigate(page: import('@playwright/test').Page) {
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('#login-button');
    await expect(page).toHaveURL(/\/(dashboard|inventory|grocery)/, { timeout: 15000 });
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');
  }

  // -----------------------------------------------------------------------
  // Tests
  // -----------------------------------------------------------------------

  test('inventory page loads with items and displays profile name (FK join)', async ({ page }) => {
    await loginAndNavigate(page);

    // Verify item card renders with the "by [name]" text that requires
    // the profiles:added_by FK join to work
    const itemCard = page.locator('button', { hasText: 'Salmon fillet' });
    await expect(itemCard).toBeVisible({ timeout: 10000 });
    await expect(itemCard.locator('text=by Inventory Tester')).toBeVisible();
  });

  test('clicking item opens detail sheet with all info fields', async ({ page }) => {
    await loginAndNavigate(page);

    // Click the item to open the detail sheet
    await page.locator('button', { hasText: 'Salmon fillet' }).click();

    // Sheet should appear with item name in the title
    const sheet = page.locator('[data-slot="sheet-content"]');
    await expect(sheet).toBeVisible({ timeout: 5000 });

    // Verify all info fields render
    await expect(sheet.getByText('Salmon fillet')).toBeVisible();
    await expect(sheet.getByText('1 lb')).toBeVisible();
    await expect(sheet.getByText(/Fridge/)).toBeVisible();
    await expect(sheet.getByText(/days left/)).toBeVisible();
    await expect(sheet.getByText(/by Inventory Tester/)).toBeVisible();
    await expect(sheet.getByText(/Bought 4 times before/)).toBeVisible();
  });

  test('detail sheet has all 4 action buttons', async ({ page }) => {
    await loginAndNavigate(page);

    await page.locator('button', { hasText: 'Salmon fillet' }).click();
    const sheet = page.locator('[data-slot="sheet-content"]');
    await expect(sheet).toBeVisible({ timeout: 5000 });

    // All 4 actions
    await expect(sheet.getByLabel('Edit item')).toBeVisible();
    await expect(sheet.getByLabel('Add to grocery list')).toBeVisible();
    await expect(sheet.getByLabel('Mark as used')).toBeVisible();
    await expect(sheet.getByLabel('Mark as tossed')).toBeVisible();
  });

  test('Edit button opens inline edit form', async ({ page }) => {
    await loginAndNavigate(page);

    await page.locator('button', { hasText: 'Salmon fillet' }).click();
    const sheet = page.locator('[data-slot="sheet-content"]');
    await expect(sheet).toBeVisible({ timeout: 5000 });

    // Click Edit
    await sheet.getByLabel('Edit item').click();

    // Edit form should appear with pre-filled values
    const nameInput = sheet.locator('#edit-item-name');
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveValue('Salmon fillet');

    const qtyInput = sheet.locator('#edit-item-quantity');
    await expect(qtyInput).toBeVisible();
    await expect(qtyInput).toHaveValue('1 lb');

    // Location buttons should be visible
    await expect(sheet.getByLabel('Fridge location')).toBeVisible();
    await expect(sheet.getByLabel('Freezer location')).toBeVisible();
    await expect(sheet.getByLabel('Pantry location')).toBeVisible();

    // Cancel/Save buttons
    await expect(sheet.getByText('Cancel')).toBeVisible();
    await expect(sheet.getByText('Save')).toBeVisible();
  });

  test('Edit cancel returns to info view', async ({ page }) => {
    await loginAndNavigate(page);

    await page.locator('button', { hasText: 'Salmon fillet' }).click();
    const sheet = page.locator('[data-slot="sheet-content"]');
    await expect(sheet).toBeVisible({ timeout: 5000 });

    await sheet.getByLabel('Edit item').click();
    await expect(sheet.locator('#edit-item-name')).toBeVisible();

    // Click Cancel
    await sheet.getByText('Cancel').click();

    // Should be back to action buttons, no edit form
    await expect(sheet.locator('#edit-item-name')).not.toBeVisible();
    await expect(sheet.getByLabel('Edit item')).toBeVisible();
  });

  test('"Used it" removes item from inventory', async ({ page }) => {
    await loginAndNavigate(page);

    // Add a temporary item to discard
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + 3);
    await adminClient.from('inventory_items').insert({
      name: 'Temp yogurt',
      quantity: '1 cup',
      category_id: categoryId,
      location: 'fridge',
      household_id: testHouseholdId,
      added_by: testUserId,
      source: 'manual',
      expiration_date: expDate.toISOString().split('T')[0],
      expiration_source: 'default',
    });

    // Refresh the page to pick up the new item
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');

    const yogurtCard = page.locator('button', { hasText: 'Temp yogurt' });
    await expect(yogurtCard).toBeVisible({ timeout: 10000 });

    // Open detail sheet and click "Used it"
    await yogurtCard.click();
    const sheet = page.locator('[data-slot="sheet-content"]');
    await expect(sheet).toBeVisible({ timeout: 5000 });

    await sheet.getByLabel('Mark as used').click();

    // Sheet should close and item should disappear from the list
    await expect(sheet).not.toBeVisible({ timeout: 5000 });
    await expect(yogurtCard).not.toBeVisible({ timeout: 5000 });
  });

  test('"Add to List" creates a grocery item', async ({ page }) => {
    await loginAndNavigate(page);

    await page.locator('button', { hasText: 'Salmon fillet' }).click();
    const sheet = page.locator('[data-slot="sheet-content"]');
    await expect(sheet).toBeVisible({ timeout: 5000 });

    await sheet.getByLabel('Add to grocery list').click();

    // Should show success toast
    await expect(page.getByText('Added to grocery list')).toBeVisible({ timeout: 5000 });

    // Verify in DB
    const { data: groceryItems } = await adminClient
      .from('grocery_items')
      .select('name')
      .eq('household_id', testHouseholdId)
      .eq('name', 'Salmon fillet')
      .is('completed_at', null);

    expect(groceryItems!.length).toBeGreaterThanOrEqual(1);
  });
});
