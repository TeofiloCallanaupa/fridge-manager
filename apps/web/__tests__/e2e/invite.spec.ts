import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

import { execSync } from 'child_process';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
let SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_ROLE_KEY) {
  try {
    const statusJson = execSync('npx supabase status -o json', { encoding: 'utf-8' });
    const status = JSON.parse(statusJson);
    SUPABASE_SERVICE_ROLE_KEY = status.SERVICE_ROLE_KEY;
  } catch (e) {
    console.warn('Could not fetch Supabase status. Make sure Supabase is running locally.');
  }
}


test.describe('Household Invite Flow', () => {
  let adminClient: any;
  let userA: any;
  let householdA: any;

  test.beforeAll(async () => {
    adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const emailA = `inviter-${crypto.randomUUID()}@example.com`;
    const password = 'Password123!';

    // Create User A
    await adminClient.auth.admin.createUser({ email: emailA, password, email_confirm: true });
    
    // Sign in as User A to get a token and trigger triggers
    const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const { data: authA } = await clientA.auth.signInWithPassword({ email: emailA, password });
    userA = authA.user;

    // Wait for triggers to create profiles
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Create Household A
    const { data: hA, error: hAErr } = await clientA.from('households').insert({ 
      name: 'Inviter Household',
      created_by: userA.id
    }).select().single();
    
    expect(hAErr).toBeNull();
    householdA = hA;

    // Add user A to Household A
    const { error: hmErr } = await clientA.from('household_members').insert({
      household_id: householdA.id,
      user_id: userA.id,
      role: 'owner',
    });
    expect(hmErr).toBeNull();
  });

  test('Invited user can accept invite and auto-join via signup flow', async ({ page }) => {
    test.setTimeout(60000); // Multi-step flow with edge function and signup
    // 1. User A (inviter) generates an invite via Edge Function
    const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    await clientA.auth.signInWithPassword({ email: userA.email, password: 'Password123!' });
    
    const inviteEmail = `invitee-${crypto.randomUUID()}@example.com`;
    
    const { data: inviteRes, error: invokeErr } = await clientA.functions.invoke('send-invite', {
      body: { email: inviteEmail, household_id: householdA.id }
    });
    
    expect(invokeErr).toBeNull();
    expect(inviteRes?.invite_id).toBeDefined();
    
    const token = inviteRes.invite_id;

    // 2. User B clicks the link and goes to /invite/[token]
    await page.goto(`/invite/${token}`);
    
    // 3. User B is redirected to /signup?next=/invite/[token]
    await expect(page).toHaveURL(/\/signup\?next=%2Finvite%2F.*/);
    
    // 4. User B signs up
    await page.fill('input[name="email"]', inviteEmail);
    await page.fill('input[name="password"]', 'Password123!');
    
    await page.click('#signup-button');
    await page.waitForURL(/.*signup\?message.*/);
    
    // Since we require email confirmation in the real app, let's bypass it for the test
    // by manually confirming the user in the database.
    const { data: users } = await adminClient.auth.admin.listUsers();
    const newUser = users.users.find((u: any) => u.email === inviteEmail);
    
    if (newUser && !newUser.email_confirmed_at) {
      await adminClient.auth.admin.updateUserById(newUser.id, { email_confirm: true });
    }
    
    // Set up User B's profile so the proxy doesn't redirect to onboarding
    if (newUser) {
      await adminClient.from('profiles').upsert({
        id: newUser.id,
        display_name: 'Invitee User',
        avatar_config: { style: 'adventurer', seed: 'invitee' },
      });
    }

    // Test the auto-join by just navigating to the invite link as an authenticated user:
    // (This simulates what happens when the user clicks the magic link or logs in)
    await page.goto('/login');
    await page.fill('input[name="email"]', inviteEmail);
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('#login-button');
    await page.waitForURL(/\/onboarding\/household|\/dashboard/, { timeout: 15000 });
    
    // User B clicks the invite link again (or is redirected there via next param)
    await page.goto(`/invite/${token}`);
    
    // Click Accept Invitation
    await page.click('button[type="submit"]');
    
    // 5. Should be redirected to dashboard and successfully joined
    await page.waitForURL('/dashboard');
    
    // Verify DB state
    const { data: member } = await adminClient.from('household_members')
      .select('*')
      .eq('household_id', householdA.id)
      .eq('user_id', newUser.id)
      .single();
      
    expect(member).toBeDefined();
    expect(member.role).toBe('member');
    
    const { data: invite } = await adminClient.from('household_invites')
      .select('status')
      .eq('id', token)
      .single();
      
    expect(invite.status).toBe('accepted');
  });
});
