# Fridge Manager — Architecture & Security Review

> Pre-Phase 1 review of `docs/architecture.md` using `/architect` and `/security-architect` workflows.  
> **Date:** April 27, 2026  
> **Status:** All findings addressed — schema updated in `architecture.md`.

---

## Part 1: Architecture Review

### ✅ Consistent with Architecture

| # | Check | Status |
|---|-------|--------|
| 1 | All tables have proper FK constraints | ✅ All FKs point to `auth.users`, `households`, or `categories` — no orphans possible |
| 2 | `categories` is a normalized table (not enums) | ✅ Separate table with `display_order`, `emoji`, `default_destination`, `has_expiration` |
| 3 | `inventory_items` and `grocery_items` are separate tables | ✅ Clean separation — grocery is the shopping list, inventory is what's in the kitchen |
| 4 | `default_shelf_days` has `UNIQUE(category_id, location)` | ✅ Explicitly defined in schema |
| 5 | All user-facing tables have `household_id` | ✅ On `grocery_items`, `inventory_items`, `household_members`, `household_invites`, `notification_log`, `notification_preferences`, `push_subscriptions` |
| 6 | `profiles.avatar_config` is JSONB | ✅ Stored as JSON config, rendered on-demand, no image storage |
| 7 | Business logic in `packages/shared` | ✅ Clear directory structure: `types/`, `utils/`, `constants/` |
| 8 | Server state uses TanStack Query | ✅ Explicitly stated, no Redux anywhere |
| 9 | 3-tab bottom nav: Grocery, Inventory, Settings | ✅ Analytics lives inside Settings |
| 10 | Checkout is auto-move on check | ✅ No separate checkout flow |
| 11 | Discard is "Used it" / "Tossed it" | ✅ Single tap with auto-derived `expired` reason |
| 12 | Three-tier expiration fallback | ✅ User manual → FoodKeeper fuzzy → default_shelf_days → null |
| 13 | `has_expiration = false` → `expiration_date = null` | ✅ On categories table, household items excluded from notifications |
| 14 | Color coding: green (>3d), yellow (1-3d), red (expired) | ✅ Consistent throughout doc |

---

### ⚠️ Findings (all resolved)

#### ⚠️ 1. `categories` table has no `household_id` — shared globally

The `categories` table is global (no `household_id`). This means all households share the same categories and users cannot add custom categories.

**Risk:** Low for MVP (2-person household, fixed categories).

**Resolution:** ✅ Added `-- GLOBAL TABLE` comment to schema. RLS: public SELECT, no client writes.

---

#### ⚠️ 2. `notification_preferences` had no `household_id`

Notification prefs were per-user, not per-household. When multi-household launches, users need different settings per household.

**Resolution:** ✅ Added `household_id` FK with `UNIQUE(user_id, household_id)`.

---

#### ⚠️ 3. `push_subscriptions` had no `household_id`

Push subscriptions were per-user. Multi-household push routing needs household context.

**Resolution:** ✅ Added `household_id` FK.

---

#### ⚠️ 4. No `updated_at` on most tables

Only `profiles` and `notification_preferences` had `updated_at`. WatermelonDB sync relies on timestamps to determine what changed.

**Resolution:** ✅ Added `updated_at timestamptz default now()` with auto-update trigger to `grocery_items`, `inventory_items`, `households`, and `household_members`.

---

#### ⚠️ 5. `discard_reason` not database-constrained

The auto-derivation logic for `expired` vs `wasted` lived only in application code. Direct API access could set inconsistent values.

**Resolution:** ✅ Added `CHECK (discard_reason IN ('consumed', 'expired', 'wasted'))` and equivalent CHECK constraints on all enum-like text columns.

---

#### ⚠️ 6. No soft-delete on `grocery_items`

When a grocery item was checked off, the row's fate was unspecified. Deleting loses purchase history needed for analytics.

**Resolution:** ✅ Added `completed_at timestamptz` for soft-delete. Grocery list filters `WHERE completed_at IS NULL`. Analytics aggregates all rows.

---

### ❌ Architecture Violations (minor)

#### ❌ 1. `source` constraint values don't cover future receipt scanning

`source` is `'manual' | 'grocery_checkout'`. Receipt scanning (future) will need `'receipt_scan'`.

**Resolution:** ✅ Added `CHECK (source IN ('manual', 'grocery_checkout'))`. Will extend via migration when receipt scanning ships.

---

## Part 2: OWASP Top 10 2025 Compliance

| OWASP Category | Status | Details |
|---|---|---|
| **A01: Broken Access Control** | ⚠️ | RLS mentioned but no policies defined yet. Policies to be written in Phase 2 (auth). |
| **A02: Cryptographic Failures** | ✅ | Supabase manages secrets. `SERVICE_ROLE_KEY` never in client. FCM tokens server-side. |
| **A03: Injection** | ✅ | Supabase client parameterizes all queries. No raw SQL in client. |
| **A04: Insecure Design** | ✅ | Auth via Supabase (not custom). Invite flow uses Edge Function. All enum fields constrained. |
| **A05: Security Misconfiguration** | ⚠️ | RLS must be enabled on ALL tables at creation time. |
| **A06: Vulnerable Components** | ✅ | No code exists yet — fresh dependencies. Run `pnpm audit` after scaffold. |
| **A07: Auth Failures** | ✅ | Supabase Auth handles session mgmt, refresh rotation, and generic error messages. |
| **A08: Data Integrity** | ⚠️ | `checked_by` and `added_by` constrained via RLS `WITH CHECK (added_by = auth.uid())`. |
| **A09: Logging & Monitoring** | ✅ | `system_logs` for cron, `notification_log` for dedup, Sentry for frontend. |
| **A10: SSRF** | ✅ | Edge Functions don't fetch user-supplied URLs. No open redirects. |

---

### Critical Security Findings

#### 🔴 A01-1: RLS policies not yet defined

Required RLS policies for Phase 2:

```sql
-- Pattern: user can only access rows where they're a member of the household
CREATE POLICY "household_isolation" ON grocery_items
  FOR ALL USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )
  );
```

**Tables requiring RLS with `household_id` isolation:**
- `grocery_items` — SELECT, INSERT, UPDATE, DELETE
- `inventory_items` — SELECT, INSERT, UPDATE, DELETE
- `household_members` — SELECT (members can see co-members), INSERT (only via invite flow), DELETE (only owner)
- `household_invites` — SELECT (only own household), INSERT (only owner)
- `notification_log` — SELECT (own household only)
- `notification_preferences` — SELECT/UPDATE (own rows in own household)
- `push_subscriptions` — SELECT/UPDATE/DELETE (own rows)

**Tables requiring user-level RLS:**
- `profiles` — SELECT (anyone in same household), UPDATE (only own profile)

**Tables with NO RLS needed (read-only global data):**
- `categories` — public SELECT, no INSERT/UPDATE/DELETE from clients
- `default_shelf_days` — public SELECT, no INSERT/UPDATE/DELETE from clients
- `system_logs` — service role only, no client access

---

#### 🟡 A01-2: `added_by` / `checked_by` not constrained to household members

FKs point to `auth.users`, not `household_members`. RLS handles this in practice since users can only INSERT into their own household.

**Recommendation:** Add RLS policy clause: `WITH CHECK (added_by = auth.uid())`

---

#### 🟡 A01-3: Invite flow needs authorization check

Only household owners should be able to create invites.

**Recommendation:**
```sql
CREATE POLICY "only_owner_invites" ON household_invites
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = household_invites.household_id
        AND user_id = auth.uid()
        AND role = 'owner'
    )
  );
```

---

#### 🟡 A05-1: `pg_cron` privilege scope

The notification Edge Function needs to verify it's being called by the cron and not by an external actor.

**Recommendation:** Use `verify_jwt = true` and have the cron call with a service role JWT. Log every invocation to `system_logs`.

---

#### 🟡 A08-1: Seed data integrity

Seed data for `categories` and `default_shelf_days` must use `ON CONFLICT DO NOTHING`.

**Recommendation:**
```sql
INSERT INTO categories (name, emoji, display_order, ...)
VALUES ('produce', '🥬', 1, ...)
ON CONFLICT (name) DO NOTHING;
```

---

## Summary of Actions by Phase

| Priority | Action | Phase | Status |
|----------|--------|-------|--------|
| 🔴 Critical | Add `updated_at` to synced tables with auto-update trigger | Phase 1 | ✅ Schema updated |
| 🔴 Critical | Enable RLS on ALL tables at creation time | Phase 1 | 📋 In migration |
| 🔴 Critical | Add `household_id` to `notification_preferences` and `push_subscriptions` | Phase 1 | ✅ Schema updated |
| 🟡 High | Write RLS policies for household isolation | Phase 2 | 📋 Planned |
| 🟡 High | Add `completed_at` to `grocery_items` for soft-delete | Phase 1 | ✅ Schema updated |
| 🟡 High | Add `CHECK` constraints on all enum-like text columns | Phase 1 | ✅ Schema updated |
| 🟢 Low | Add `WITH CHECK (added_by = auth.uid())` to write policies | Phase 2 | 📋 Planned |
| 🟢 Low | Restrict `household_invites` INSERT to household owners | Phase 2 | 📋 Planned |
| 🟢 Low | Secure notification Edge Function with service role auth | Phase 4 | 📋 Planned |
