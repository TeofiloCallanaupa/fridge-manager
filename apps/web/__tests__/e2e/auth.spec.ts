import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

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

test.describe('Authentication Flows', () => {
  const testEmail = `login-test-${Date.now()}@example.com`;
  const testPassword = 'SecurePassword123!';

  test.beforeAll(async () => {
    // Ensure the test user exists and is confirmed
    const { data: user, error: fetchError } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });
    
    if (fetchError && fetchError.message !== 'User already exists') {
      console.warn('Could not setup test user:', fetchError);
    }
    
    // We also need them to be fully onboarded to reach the dashboard.
    // The proxy checks: display_name, avatar_config, and household_members.
    if (user?.user) {
      await adminClient.from('profiles').upsert({
        id: user.user.id,
        display_name: 'Test Login User',
        avatar_config: { style: 'adventurer', seed: 'test-login' },
      });
      
      const { data: household } = await adminClient.from('households').insert({
        name: 'Login Test Household',
        created_by: user.user.id,
      }).select('id').single();
      
      if (household) {
        await adminClient.from('household_members').upsert({
          household_id: household.id,
          user_id: user.user.id,
          role: 'owner',
        });
      }
    }
  });

  test('Valid login flow', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();

    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('#login-button');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.getByText('Sign Out')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Test Login User')).toBeVisible({ timeout: 5000 });
  });

  test('Invalid login flow', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'wrong-email@example.com');
    await page.fill('input[name="password"]', 'WrongPassword123!');
    await page.click('#login-button');

    // Should display an error and remain on login
    await expect(page.getByText('Incorrect email or password.')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
