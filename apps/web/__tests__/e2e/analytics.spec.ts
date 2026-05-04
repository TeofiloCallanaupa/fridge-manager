import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Setup: Admin client + test user creation
// ---------------------------------------------------------------------------

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseKey) {
  throw new Error(
    'SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.test.'
  );
}

const adminClient = createClient(supabaseUrl, supabaseKey);

test.describe('Analytics Dashboard Flows', () => {
  const testEmail = `analytics-e2e-${Date.now()}@example.com`;
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
      display_name: 'Analytics Tester',
      avatar_config: { style: 'adventurer', seed: 'analytics-test' },
    });

    // Create household
    const { data: household } = await adminClient.from('households').insert({
      name: 'Analytics Test Household',
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

    // Fetch a category ID for test data
    const { data: categories } = await adminClient
      .from('categories')
      .select('id, name')
      .limit(2);

    const dairyId = categories?.find((c) => c.name === 'dairy')?.id;
    const produceId = categories?.find((c) => c.name === 'produce')?.id;

    // Seed inventory items with discard data for analytics
    const now = new Date();

    const seedItems = [
      // 3 consumed items
      {
        name: 'Analytics Milk',
        household_id: testHouseholdId,
        added_by: testUserId,
        category_id: dairyId,
        location: 'fridge',
        source: 'manual',
        added_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        discarded_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        discard_reason: 'consumed',
      },
      {
        name: 'Analytics Cheese',
        household_id: testHouseholdId,
        added_by: testUserId,
        category_id: dairyId,
        location: 'fridge',
        source: 'manual',
        added_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        discarded_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        discard_reason: 'consumed',
      },
      {
        name: 'Analytics Lettuce',
        household_id: testHouseholdId,
        added_by: testUserId,
        category_id: produceId,
        location: 'fridge',
        source: 'manual',
        added_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        discarded_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        discard_reason: 'consumed',
      },
      // 2 wasted items
      {
        name: 'Analytics Yogurt',
        household_id: testHouseholdId,
        added_by: testUserId,
        category_id: dairyId,
        location: 'fridge',
        source: 'manual',
        added_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        discarded_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        discard_reason: 'expired',
      },
      {
        name: 'Analytics Spinach',
        household_id: testHouseholdId,
        added_by: testUserId,
        category_id: produceId,
        location: 'fridge',
        source: 'manual',
        added_at: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        discarded_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        discard_reason: 'wasted',
      },
    ];

    await adminClient.from('inventory_items').insert(seedItems);
  });

  test.afterAll(async () => {
    if (testHouseholdId) {
      await adminClient.from('inventory_items').delete().eq('household_id', testHouseholdId);
      await adminClient.from('grocery_items').delete().eq('household_id', testHouseholdId);
      await adminClient.from('household_members').delete().eq('household_id', testHouseholdId);
      await adminClient.from('households').delete().eq('id', testHouseholdId);
    }
    if (testUserId) {
      await adminClient.from('profiles').delete().eq('id', testUserId);
      await adminClient.auth.admin.deleteUser(testUserId);
    }
  });

  // Helper: login and navigate to analytics
  async function loginAndNavigate(page: import('@playwright/test').Page) {
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('#login-button');

    await expect(page).toHaveURL(/\/(dashboard|grocery)/, { timeout: 15000 });

    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
  }

  // -----------------------------------------------------------------------
  // Tests
  // -----------------------------------------------------------------------

  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('renders analytics page with header and tabs', async ({ page }) => {
    await loginAndNavigate(page);

    await expect(page.getByText('Analytics')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Your food insights this month')).toBeVisible();
    await expect(page.getByTestId('tab-glance')).toBeVisible();
    await expect(page.getByTestId('tab-charts')).toBeVisible();
  });

  test('At a Glance tab shows stat cards with data', async ({ page }) => {
    await loginAndNavigate(page);

    // Wait for stat cards to render
    const statCards = page.getByTestId('stat-cards');
    await expect(statCards).toBeVisible({ timeout: 15000 });

    // Should show consumed count (3)
    await expect(page.getByText('3')).toBeVisible();

    // Should show wasted count (2)
    await expect(page.getByText('2')).toBeVisible();

    // Waste rate should be 40% (2 / 5 = 40%)
    await expect(page.getByText('40%')).toBeVisible();

    // Top wasted category should be dairy (2 dairy wasted)
    await expect(page.getByText(/dairy/i)).toBeVisible();
  });

  test('Charts tab shows trend and category charts', async ({ page }) => {
    await loginAndNavigate(page);

    // Switch to Charts tab
    await page.getByTestId('tab-charts').click();

    // Should show chart sections
    await expect(page.getByTestId('trends-chart')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('category-chart')).toBeVisible();

    // Chart titles
    await expect(page.getByText('Monthly Trend')).toBeVisible();
    await expect(page.getByText('Waste by Category')).toBeVisible();
  });

  test('tab switching works correctly', async ({ page }) => {
    await loginAndNavigate(page);

    // Default tab is "At a Glance"
    await expect(page.getByTestId('stat-cards')).toBeVisible({ timeout: 15000 });

    // Switch to Charts
    await page.getByTestId('tab-charts').click();
    await expect(page.getByTestId('trends-chart')).toBeVisible({ timeout: 5000 });

    // Switch back to At a Glance
    await page.getByTestId('tab-glance').click();
    await expect(page.getByTestId('stat-cards')).toBeVisible({ timeout: 5000 });
  });

  test('dashboard links to analytics page', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('#login-button');

    await expect(page).toHaveURL(/\/(dashboard|grocery)/, { timeout: 15000 });

    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Click the analytics nav card
    const analyticsLink = page.getByTestId('nav-analytics');
    await expect(analyticsLink).toBeVisible({ timeout: 10000 });
    await analyticsLink.click();

    // Should navigate to analytics
    await expect(page).toHaveURL(/\/analytics/, { timeout: 10000 });
  });
});
