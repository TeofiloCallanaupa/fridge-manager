import { test, expect } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Setup clients with service role to clean up if needed, but we'll try to stick to anon key + auth
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

test.describe('Row Level Security (Integration)', () => {
  // Only run API tests once (not per browser)
  test.skip(({ browserName }) => browserName !== 'chromium', 'API tests only need to run once');

  let adminClient: SupabaseClient;
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;
  let userA: any;
  let userB: any;
  let householdA: any;
  let householdB: any;
  let categoryId: string;

  test.beforeAll(async () => {
    // Admin client to bypass email confirmation
    adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // We create isolated clients for each user
    clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

    const emailA = `test-a-${crypto.randomUUID()}@example.com`;
    const emailB = `test-b-${crypto.randomUUID()}@example.com`;
    const password = 'Password123!';

    // Create User A and confirm
    await adminClient.auth.admin.createUser({ email: emailA, password, email_confirm: true });
    const { data: authA, error: errA } = await clientA.auth.signInWithPassword({ email: emailA, password });
    expect(errA).toBeNull();
    userA = authA.user;

    // Create User B and confirm
    await adminClient.auth.admin.createUser({ email: emailB, password, email_confirm: true });
    const { data: authB, error: errB } = await clientB.auth.signInWithPassword({ email: emailB, password });
    expect(errB).toBeNull();
    userB = authB.user;

    // Wait for triggers to create profiles
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Client A creates Household A and adds themselves
    const { data: hA, error: hAErr } = await clientA.from('households').insert({ 
      name: 'Household A',
      created_by: userA.id
    }).select().single();
    expect(hAErr).toBeNull();
    householdA = hA;

    const { error: hmAErr } = await clientA.from('household_members').insert({
      household_id: householdA.id,
      user_id: userA.id,
      role: 'owner',
    });
    expect(hmAErr).toBeNull();

    // Client B creates Household B and adds themselves
    const { data: hB, error: hBErr } = await clientB.from('households').insert({ 
      name: 'Household B',
      created_by: userB.id
    }).select().single();
    expect(hBErr).toBeNull();
    householdB = hB;

    const { error: hmBErr } = await clientB.from('household_members').insert({
      household_id: householdB.id,
      user_id: userB.id,
      role: 'owner',
    });
    expect(hmBErr).toBeNull();

    // Get a valid category ID to use for items
    const { data: categories } = await clientA.from('categories').select('id').limit(1);
    expect(categories?.length).toBeGreaterThan(0);
    categoryId = categories![0].id;
  });

  test('Profiles visibility across households', async () => {
    // A should see their own profile
    const { data: profileA } = await clientA.from('profiles').select('*').eq('id', userA.id);
    expect(profileA).toHaveLength(1);

    // A should NOT see B's profile because they share no households
    const { data: profileB_fromA } = await clientA.from('profiles').select('*').eq('id', userB.id);
    expect(profileB_fromA).toHaveLength(0);
  });

  test('Grocery Items: Read/Write isolation', async () => {
    // User A can write to Household A
    const { error: insertA } = await clientA.from('grocery_items').insert({
      household_id: householdA.id,
      name: 'Milk',
      category_id: categoryId,
      added_by: userA.id,
    });
    expect(insertA).toBeNull();

    // User A cannot write to Household B
    const { error: insertB } = await clientA.from('grocery_items').insert({
      household_id: householdB.id,
      name: 'Bread',
      category_id: categoryId,
      added_by: userA.id,
    });
    expect(insertB).not.toBeNull(); // Should fail RLS

    // User B writes to Household B
    await clientB.from('grocery_items').insert({
      household_id: householdB.id,
      name: 'Eggs',
      category_id: categoryId,
      added_by: userB.id,
    });

    // User A can read Household A's items
    const { data: itemsA } = await clientA.from('grocery_items').select('*').eq('household_id', householdA.id);
    expect(itemsA?.length).toBeGreaterThan(0);
    expect(itemsA![0].name).toBe('Milk');

    // User A cannot read Household B's items
    const { data: itemsB } = await clientA.from('grocery_items').select('*').eq('household_id', householdB.id);
    expect(itemsB).toHaveLength(0);

    // User A cannot delete Household B's items
    const { error: delErr } = await clientA.from('grocery_items').delete().eq('household_id', householdB.id);
    expect(delErr).toBeNull(); // Delete with RLS succeeds silently by returning 0 rows
    const { data: checkItemsB } = await clientB.from('grocery_items').select('*').eq('household_id', householdB.id);
    expect(checkItemsB?.length).toBeGreaterThan(0); // Items should still be there
  });

  test('Inventory Items: Read/Write isolation', async () => {
    // User A can write to Household A
    const { error: insertA } = await clientA.from('inventory_items').insert({
      household_id: householdA.id,
      name: 'Cheese',
      category_id: categoryId,
      location: 'fridge',
      added_by: userA.id,
    });
    expect(insertA).toBeNull();

    // User A cannot write to Household B
    const { error: insertB } = await clientA.from('inventory_items').insert({
      household_id: householdB.id,
      name: 'Apples',
      category_id: categoryId,
      location: 'fridge',
      added_by: userA.id,
    });
    expect(insertB).not.toBeNull(); // Should fail RLS

    // User B writes to Household B
    await clientB.from('inventory_items').insert({
      household_id: householdB.id,
      name: 'Yogurt',
      category_id: categoryId,
      location: 'fridge',
      added_by: userB.id,
    });

    // User A can read Household A's items
    const { data: itemsA } = await clientA.from('inventory_items').select('*').eq('household_id', householdA.id);
    expect(itemsA?.length).toBeGreaterThan(0);
    expect(itemsA![0].name).toBe('Cheese');

    // User A cannot read Household B's items
    const { data: itemsB } = await clientA.from('inventory_items').select('*').eq('household_id', householdB.id);
    expect(itemsB).toHaveLength(0);
  });

  test('Household Members constraints', async () => {
    // User A cannot add User B to Household B
    const { error: err1 } = await clientA.from('household_members').insert({
      household_id: householdB.id,
      user_id: userB.id,
      role: 'member',
    });
    expect(err1).not.toBeNull(); // RLS failure

    // User A cannot add User B to Household A (needs to happen via invite service role)
    // The policy says user_id = auth.uid() for members insert, so they can't insert others
    const { error: err2 } = await clientA.from('household_members').insert({
      household_id: householdA.id,
      user_id: userB.id,
      role: 'member',
    });
    expect(err2).not.toBeNull(); // RLS failure
  });

  test('Invites: Creation and reading', async () => {
    // User A can create an invite for Household A
    const { error: errA } = await clientA.from('household_invites').insert({
      household_id: householdA.id,
      invited_by: userA.id,
      invited_email: 'new-person@example.com',
    });
    expect(errA).toBeNull();

    // User A cannot create an invite for Household B
    const { error: errB } = await clientA.from('household_invites').insert({
      household_id: householdB.id,
      invited_by: userA.id,
      invited_email: 'hacker@example.com',
    });
    expect(errB).not.toBeNull();

    // User B cannot see Household A's invites
    const { data: invitesB } = await clientB.from('household_invites').select('*').eq('household_id', householdA.id);
    expect(invitesB).toHaveLength(0);
  });
});
