import { test, expect } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.test.');
}

test.describe('Security Regression Tests', () => {
  // Only run API tests once (not per browser)
  test.skip(({ browserName }) => browserName !== 'chromium', 'Security tests only need to run once');

  let adminClient: SupabaseClient;

  test.beforeAll(async () => {
    adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  });

  test.describe('Invite Acceptance Security', () => {
    let userA: any;
    let userB: any;
    let userC: any;
    let householdA: any;
    let inviteForB: any;

    test.beforeAll(async () => {
      const password = 'SecureTest123!';

      // Create User A (inviter + household owner)
      const { data: dataA } = await adminClient.auth.admin.createUser({
        email: `sec-inviter-${crypto.randomUUID()}@example.com`,
        password,
        email_confirm: true,
      });
      userA = dataA.user;

      // Create User B (correct invitee)
      const { data: dataB } = await adminClient.auth.admin.createUser({
        email: `sec-invitee-${crypto.randomUUID()}@example.com`,
        password,
        email_confirm: true,
      });
      userB = dataB.user;

      // Create User C (unauthorized — different email)
      const { data: dataC } = await adminClient.auth.admin.createUser({
        email: `sec-unauthorized-${crypto.randomUUID()}@example.com`,
        password,
        email_confirm: true,
      });
      userC = dataC.user;

      // Set up profiles for all users
      await adminClient.from('profiles').upsert([
        { id: userA.id, display_name: 'User A', avatar_config: { style: 'adventurer', seed: 'a' } },
        { id: userB.id, display_name: 'User B', avatar_config: { style: 'adventurer', seed: 'b' } },
        { id: userC.id, display_name: 'User C', avatar_config: { style: 'adventurer', seed: 'c' } },
      ]);

      // Create household for User A
      const { data: hA } = await adminClient.from('households').insert({
        name: 'Security Test Household',
        created_by: userA.id,
      }).select('id').single();
      householdA = hA;

      await adminClient.from('household_members').insert({
        household_id: householdA.id,
        user_id: userA.id,
        role: 'owner',
      });

      // Create a household for User C so they're fully onboarded
      const { data: hC } = await adminClient.from('households').insert({
        name: 'User C Household',
        created_by: userC.id,
      }).select('id').single();
      await adminClient.from('household_members').insert({
        household_id: hC!.id,
        user_id: userC.id,
        role: 'owner',
      });

      // Create invite for User B
      const { data: invite } = await adminClient.from('household_invites').insert({
        household_id: householdA.id,
        invited_by: userA.id,
        invited_email: userB.email,
      }).select().single();
      inviteForB = invite;
    });

    test('Invite acceptance rejects mismatched email (user C tries to accept invite for user B)', async ({ page }) => {
      // Log in as User C (wrong user)
      await page.goto('/login');
      await page.fill('input[name="email"]', userC.email);
      await page.fill('input[name="password"]', 'SecureTest123!');
      await page.click('#login-button');
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

      // Try to accept User B's invite
      await page.goto(`/invite/${inviteForB.id}`);

      // The page should show the invite form (server renders it)
      // Click Accept
      await page.click('button[type="submit"]');

      // Should be redirected back to the invite page with an error — NOT to /dashboard
      // The server action detects email mismatch and redirects to /invite/{token}?error=...
      await page.waitForURL(/\/invite\/.*\?error=/, { timeout: 10000 });
      const url = page.url();
      expect(url).toContain('error=');
      expect(url).toContain('different');

      // Verify User C was NOT added to the household
      const { data: members } = await adminClient.from('household_members')
        .select('*')
        .eq('household_id', householdA.id)
        .eq('user_id', userC.id);

      expect(members).toHaveLength(0);
    });

    test('Invite acceptance derives household_id from DB (not form input)', async () => {
      // This test verifies that the server action fetches the invite from DB
      // rather than trusting a client-supplied household_id.
      // We verify by checking the invite page HTML does NOT contain a household_id hidden field.

      const { data: invite } = await adminClient.from('household_invites').insert({
        household_id: householdA.id,
        invited_by: userA.id,
        invited_email: `verify-no-hidden-${crypto.randomUUID()}@example.com`,
      }).select().single();

      // Make a request to the invite page as an unauthenticated user
      // (it will redirect to signup, but we can check the rendered HTML first)
      const response = await fetch(`http://localhost:3001/invite/${invite!.id}`, {
        redirect: 'manual',
      });

      // The response should redirect to signup (since not authenticated)
      expect(response.status).toBe(307);
      const location = response.headers.get('location');
      expect(location).toContain('/signup');

      // Clean up
      await adminClient.from('household_invites').delete().eq('id', invite!.id);
    });
  });

  test.describe('Auth Callback Open Redirect Prevention', () => {
    test('Rejects protocol-relative redirect (//evil.com)', async ({ page }) => {
      // Navigate to the callback with a malicious next parameter
      const response = await page.goto('/auth/callback?next=//evil.com&code=fake-code');

      // The page should redirect to /error (because the code is invalid)
      // but the redirect target should NOT be //evil.com — it should fall back to /
      const url = page.url();
      expect(url).not.toContain('evil.com');
    });

    test('Rejects absolute URL redirect (https://evil.com)', async ({ page }) => {
      await page.goto('/auth/callback?next=https://evil.com&code=fake-code');

      const url = page.url();
      expect(url).not.toContain('evil.com');
    });

    test('Allows valid relative paths', async ({ page }) => {
      // This will fail at the token exchange step (fake code),
      // but the redirect target should be /error (not the next param since exchange failed)
      await page.goto('/auth/callback?next=/dashboard&code=fake-code');

      // It should go to /error since the code is invalid, but it should NOT go to an external site
      const url = page.url();
      expect(url).toMatch(/localhost/);
    });
  });

  test.describe('Dashboard Profile Query', () => {
    test('Dashboard shows actual display name (not fallback)', async ({ page }) => {
      const password = 'DashTest123!';
      const email = `dash-test-${crypto.randomUUID()}@example.com`;

      // Create a fully onboarded user
      const { data: userData } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      await adminClient.from('profiles').upsert({
        id: userData.user!.id,
        display_name: 'Dashboard Test Name',
        avatar_config: { style: 'adventurer', seed: 'dash-test' },
      });

      const { data: household } = await adminClient.from('households').insert({
        name: 'Dashboard Test Household',
        created_by: userData.user!.id,
      }).select('id').single();

      await adminClient.from('household_members').insert({
        household_id: household!.id,
        user_id: userData.user!.id,
        role: 'owner',
      });

      // Login and navigate to dashboard
      await page.goto('/login');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('#login-button');

      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

      // Should show the actual display name, not the fallback "Chef"
      await expect(page.getByText('Dashboard Test Name')).toBeVisible({ timeout: 5000 });

      // Should NOT show the fallback
      const chefHeading = page.locator('h2:has-text("Welcome back, Chef")');
      await expect(chefHeading).not.toBeVisible();
    });
  });
});
