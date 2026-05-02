# Fridge Manager — Prompt Playbook

> Sequential prompts to build the project from scaffold to production.
> Run these in the **fridge-manager workspace** in Antigravity.
> Each prompt assumes the previous one completed successfully.

---

## Phase 0: Design & Architecture ✅ DONE

These were already run:

- [x] `/designer` — Create Stitch project, generate Grocery List screen
- [x] `/designer` — Inventory View screen
- [x] `/designer` — Item Detail bottom sheet
- [x] `/architect` — Architecture review
- [x] `/security-architect` — OWASP compliance review

---

## Phase 1: Shared Logic (TDD) ✅ DONE

### 1.1 — Commit the red phase

> Run this as a git command, not an Antigravity prompt.

```bash
git add -A && git commit -m "test: add 28 unit tests for shared utils (TDD red phase)"
```

### 1.2 — Implement shared utils (green phase)

```
Using /coder and /tester, implement the shared utility functions in packages/shared/src/utils/ to make all 24 failing tests pass. Run pnpm --filter shared test after each function to verify green. Do not modify any tests — only write implementation code.
```

### 1.3 — Commit the green phase

```bash
git add -A && git commit -m "feat: implement shared utils — all 28 tests passing (TDD green phase)"
```

---

## Phase 2: Database ✅ DONE

### 2.1 — Create the initial migration

```
Using /coder, create supabase/migrations/001_initial_schema.sql from docs/architecture.md. Include all core tables (profiles, households, household_members, household_invites, categories, grocery_items, inventory_items, default_shelf_days), all CHECK constraints, the updated_at auto-trigger, and RLS policies for every table. Categories and default_shelf_days are global (public SELECT, no client writes). All other tables enforce household isolation.
```

### 2.2 — Security review the migration

```
Using /security-architect, review supabase/migrations/001_initial_schema.sql for OWASP compliance. Check: RLS on every table, no missing policies, no SQL injection vectors, proper CHECK constraints on all enum columns, household isolation is enforced.
```

### 2.3 — Create seed data migration

```
Using /coder, create supabase/migrations/002_seed_categories.sql to insert the category seed data and default_shelf_days data from docs/architecture.md. Use ON CONFLICT DO NOTHING for idempotent re-runs.
```

### 2.4 — Apply migrations to Supabase

```
Apply supabase/migrations/001_initial_schema.sql and 002_seed_categories.sql to the Supabase project. Then verify the schema by listing all tables and running a SELECT on categories to confirm seed data.
```

### 2.5 — Generate TypeScript types

```
Generate TypeScript types from the Supabase schema and save them to packages/shared/src/types/database.ts. Then update the existing type files in packages/shared/src/types/ to use these generated types as their source of truth.
```

### 2.6 — Commit Database Phase

> Run this as a git command.

```bash
git add -A && git commit -m "feat: complete database schema and migrations" && git push
```

---

## Phase 3: Auth & Onboarding ✅ DONE

### 3.1 — Web auth setup

```
Using /coder, set up Supabase Auth in apps/web. Install @supabase/ssr, create the Supabase client utilities (server + browser clients), add middleware for session management, and create the auth pages: /login (email/password + magic link), /signup, and /auth/callback. Follow Next.js App Router patterns.
```

### 3.2 — Design auth & onboarding flows

```
Using /designer, design the authentication pages (Login, Signup) and the onboarding flow (Profile Setup, Avatar Creator, Household Creation). Sync these to the Stitch design system.
```

### 3.3 — Apply onboarding designs (web)

```
Using /coder, update the existing auth pages and onboarding flow in apps/web to match the new Stitch designs. Ensure that the existing logic and tests are preserved while updating the UI, styling, and layout.
```

### 3.4 — Invite system

```
Using /coder, create the household invite flow. Create a Supabase Edge Function that: receives an email address, creates a household_invites row, and sends an invite email with a deep link. On the web, create /invite/[token] that auto-joins the invited user to the household when they sign up or log in. Invites expire after 7 days.
```

### 3.5 — Mobile auth setup → Moved to Phase 5

> Mobile auth was moved to Phase 5 (Mobile) to keep web-first focus.

### 3.6 — Write component tests (Auth)

```
Using /tester, write component tests for the web and mobile auth components, onboarding forms, and invite logic.
```

### 3.7 — E2E test & Commit Auth Phase

```
Using /e2e, verify the web auth and onboarding flows manually, then write Playwright tests in apps/web/__tests__/e2e/ to ensure all signup, login, and onboarding paths are green.
```

> Run this as a git command.

```bash
git add -A && git commit -m "feat: complete auth & onboarding flows" && git push
```

---

## Phase 4: Core Features (Web First)

> **Pattern learned from 4.1:** Every feature follows Build → Test → Review → Fix → Commit.
> Never batch tests or reviews to the end — bugs compound silently.

### 4.1 — Grocery list (web) ✅ DONE

```
Using /coder, build the grocery list page in apps/web. Reference the Stitch design in .stitch/designs/ for visual direction. Features: category-grouped layout sorted by categories.display_order, add item with category picker and destination selector, real-time sync via Supabase Realtime, check-off animation that auto-creates an inventory_item (checkout flow from architecture.md). Use TanStack Query for data fetching and shadcn/ui components.
```

```
Using /tester and /e2e, write tests for the grocery list: hook unit tests (validation, checkout logic, delete), component tests (category section, add-item sheet, loading/empty states), and E2E Playwright tests (add item, check-off creates inventory, delete, sync badge). Run all tests.
```

```
Using /architect and /security-architect, review the grocery list implementation. Check: Realtime publication exists, checkout atomicity, error handling on mutations, input validation, accessibility on touch devices.
```

> Commit:
```bash
git add -A && git commit -m "feat: grocery list page — all review fixes + tests" && git push
```

---

### 4.2 — Inventory view (web) ✅ DONE

```
Using /coder, build the inventory page in apps/web. Reference the Stitch design. Features: tabs for fridge/freezer/pantry, color-coded expiration badges (green >3 days, yellow 1-3 days, red expired), "added X days ago" counter on every item, FEFO sorting (closest to expiry first), long-press/click opens item detail sheet. Use shared utils from packages/shared for expiration calculations. Requirements: toast error handling on all mutations, maxLength on text inputs, aria-labels on interactive elements.
```

```
Using /tester, write component + hook tests for the inventory view: expiration color thresholds match shared util outputs, FEFO sort order is correct, tab switching works, empty state renders. Run pnpm --filter web test to verify.
```

```
Using /architect and /reviewer, review the inventory view. Check: uses shared expiration utils (no duplication), proper error boundaries, no non-null assertions, tab state persists correctly.
```

> Commit:
```bash
git add -A && git commit -m "feat: inventory view with expiration badges and FEFO sorting" && git push
```

---

### 4.3 — Item detail sheet (web)

```
Using /coder, build the item detail bottom sheet in apps/web. Reference the Stitch design. Shows: item name, category emoji, location, expiration with color + days remaining, "added X days ago", added by (display name + avatar), purchase history count. Actions: edit, mark as used, mark as tossed (triggers discard flow), add to grocery list. Requirements: toast on mutation errors, loading states for async actions, accessible close button.
```

```
Using /tester, write component tests for the item detail sheet: renders all fields, edit mutation calls supabase, discard action sets correct reason, "add to grocery list" creates grocery_item. Run tests.
```

> Commit:
```bash
git add -A && git commit -m "feat: item detail sheet with edit, discard, and re-add actions" && git push
```

---

### 4.4 — Design discard flow

```
Using /designer, design the Discard Flow modals/prompts and the "Recently Removed" page for the web app.
```

### 4.5 — Discard flow + recently removed (web)

```
Using /coder, build the discard flow in apps/web. When user marks an item: prompt "Used it" (consumed) or "Tossed it" (wasted/expired). If user taps 'Tossed it' and `now() > expiration_date`, set `discard_reason = 'expired'`. Otherwise set `discard_reason = 'wasted'`. Set discarded_at to now(). Show "Add to grocery list?" prompt. Build the Recently Removed section showing last 20 discarded items with who removed it, when, and reason. From Recently Removed, allow 'change reason' (tap to toggle consumed ↔ wasted/expired) and 'restore to inventory' as separate actions. Requirements: toast error handling, optimistic updates with rollback, accessible modal controls.
```

```
Using /tester, write tests for the discard flow: "Used" vs "Tossed" sets correct reason, auto-detect logic matches expiration_date, change reason updates correctly, undo restores item, re-add creates grocery_item. Run tests.
```

```
Using /security-architect, review the discard flow. Check: RLS enforces household isolation on discards, undo doesn't bypass permissions, notification triggers won't fire for already-discarded items.
```

> Commit:
```bash
git add -A && git commit -m "feat: discard flow with undo, change reason, and recently removed" && git push
```

---

### 4.6 — Quick Add to Inventory

```
Using /coder, build the "Quick Add" feature in apps/web. Add a floating "+" FAB or "Add Item" button to the inventory view that opens a form for direct inventory item creation without going through the grocery list. Include category picker, location selector, and expiration fields. Reference the Stitch design. Use TanStack Query for data fetching and shadcn/ui components.
```

```
Using /tester, write component tests for the Quick Add to Inventory feature: ensures form validation, creation mutation calls supabase with correct payload, and optimistic updates reflect the new item in the inventory list. Run tests.
```

> Commit:
```bash
git add -A && git commit -m "feat: quick add to inventory" && git push
```

---

### 4.7 — FoodKeeper Data & Fuzzy Match

```
Using /coder, fetch the USDA FoodKeeper dataset and format it into a lightweight JSON file saved to packages/shared/data/foodkeeper.json. Build a fuzzy matching utility function fuzzyMatchFoodKeeper(itemName) in packages/shared/src/utils/ to look up shelf life ranges based on item names.
```

```
Using /coder, integrate fuzzyMatchFoodKeeper into the checkout flow (both grocery list check-off and Quick Add to Inventory). Use the FoodKeeper data as the secondary fallback (Tier 2) before falling back to default_shelf_days.
```

```
Using /tester, write unit tests for the fuzzy matching logic to ensure accuracy and performance. Write tests verifying that checkout flow correctly assigns shelf life based on FoodKeeper data. Run tests.
```

> Commit:
```bash
git add -A && git commit -m "feat: foodkeeper fuzzy match data and checkout integration" && git push
```

---

### 4.8 — Phase 4 E2E integration test

```
Using /e2e, write Playwright tests covering the full web workflow: add grocery item → check off → verify in inventory → quick add item → open detail sheet → discard → verify in recently removed → change discard reason → undo → verify restored. Ensure that expiration date assignment from FoodKeeper fuzzy match is verified. Run pnpm --filter web test:e2e.
```

> Commit:
```bash
git add -A && git commit -m "test: phase 4 E2E integration tests" && git push
```

---

## Phase 5: Core Features (Mobile)

### 5.0 — Mobile auth setup (moved from Phase 3)

```
Using /coder, set up Supabase Auth in apps/mobile (Expo). Install @supabase/supabase-js, create the Supabase client with AsyncStorage for token persistence, and create the auth screens: Login, Signup, and the same onboarding flow (profile → avatar → household). Use React Native Paper components.
```

```
Using /tester, write component tests for the mobile auth screens and onboarding forms using React Native Testing Library.
```

> Commit:
```bash
git add -A && git commit -m "feat: mobile auth and onboarding" && git push
```

---

### 5.1 — Grocery list (mobile)

```
Using /coder, build the grocery list screen in apps/mobile. Same features as web (category-grouped, check-off, real-time sync) but using React Native Paper components (List.Section, Checkbox, FAB for add). Implement WatermelonDB local storage for offline support. Sync with Supabase when online.
```

### 5.2 — Inventory view (mobile)

```
Using /coder, build the inventory screen in apps/mobile. Tabs for fridge/freezer/pantry using React Native Paper SegmentedButtons. Color-coded expiration badges, "added X days ago" counter, FEFO sorting. Long-press opens item detail bottom sheet (React Native Paper BottomSheet).
```

### 5.3 — Discard flow + recently removed (mobile)

```
Using /coder, build the discard flow and Recently Removed screen in apps/mobile. Same logic as web but using React Native Paper components. Swipe-to-discard gesture on inventory items. Undo via Snackbar.
```

### 5.4 — Write component tests (mobile)

```
Using /tester, write component tests for the mobile grocery list, inventory view, and discard flow in apps/mobile/__tests__/components/ using React Native Testing Library.
```

### 5.5 — Manual E2E test & Commit Mobile Features

> Run this as a git command.

```bash
git add -A && git commit -m "feat: complete core mobile features" && git push
```

---

## Phase 6: Notifications

### 6.1 — Notification Edge Function

```
Using /coder, create the Supabase Edge Function for notifications. It should: query inventory_items hitting expiration thresholds today (halfway, 2-day, 1-day, day-of, post-expiration), check notification_log to skip duplicates, check each user's notification_preferences and quiet hours, send FCM push to Android devices and Web Push to browsers, log to notification_log and system_logs.
```

### 6.2 — Notification tables migration

```
Using /coder, create supabase/migrations/003_notification_tables.sql with notification_preferences, push_subscriptions, notification_log, and system_logs tables. Include RLS policies and CHECK constraints.
```

### 6.3 — pg_cron setup

```
Using /coder, set up the pg_cron job in Supabase to trigger the notification Edge Function daily at 1pm UTC (9am ET). Create a migration for enabling pg_cron and scheduling the job.
```

### 6.4 — Mobile push setup

```
Using /coder, set up Firebase Cloud Messaging in apps/mobile (Expo). Register for push notifications on app launch, save the FCM token to push_subscriptions table, handle incoming push notifications with proper navigation to the relevant inventory item.
```

### 6.5 — Test Notifications

```
Using /tester, write unit tests for the notification query logic in packages/shared and verify the Edge Function behavior.
```

### 6.6 — Commit Notifications

> Run this as a git command.

```bash
git add -A && git commit -m "feat: complete push notifications" && git push
```

---

## Phase 7: Analytics

### 7.1 — Analytics queries

```
Using /coder, create the analytics query functions in packages/shared. Calculate: waste rate (items wasted / total discarded), items consumed vs wasted by month, top wasted categories, shopping frequency, average shelf life by category. Use TanStack Query for caching.
```

### 7.2 — Design analytics dashboard

```
Using /designer, design the Analytics page layout (At a Glance stats + Charts tabs). Sync with the Stitch design system.
```

### 7.3 — Analytics page (web)

```
Using /coder, build the analytics page in apps/web with two tabs. "At a Glance" tab: text stats (waste rate, items consumed, top wasted category, shopping trips, streaks). "Charts" tab: Victory charts (waste rate over time, items wasted by category, most purchased items, shopping frequency). Reference the Stitch design.
```

### 7.4 — Analytics screen (mobile)

```
Using /coder, build the analytics screen in apps/mobile using victory-native for charts. Same two-tab layout as web. Use shared query functions from packages/shared.
```

### 7.5 — Write component tests (Analytics)

```
Using /tester, write component tests for the analytics charts and stat displays.
```

### 7.6 — E2E test & Commit Analytics

```
Using /e2e, verify the analytics views and data fetching. Add Playwright tests to ensure the web analytics page charts and stats render correctly.
```

> Run this as a git command.

```bash
git add -A && git commit -m "feat: complete analytics dashboards" && git push
```

---

## Phase 8: Polish & Deploy

### 8.1 — Final E2E Polish

```
Using /e2e, do a final review of all Playwright E2E tests across the 5 critical paths. Ensure all tests are resilient, fast, and pass reliably without flaky behavior. Run pnpm --filter web test:e2e.
```

### 8.2 — Error tracking

```
Using /coder, set up Sentry in both apps/web and apps/mobile. Install @sentry/nextjs and @sentry/react-native. Configure error boundaries, performance monitoring, and source maps. Add Sentry DSN to environment variables.
```

### 8.3 — Security final review

```
Using /security-architect, do a final OWASP compliance review of the entire codebase. Check: all RLS policies are enforced, no SQL injection vectors, auth tokens handled properly, Edge Functions validate inputs, no secrets in client code, CORS configured correctly.
```

### 8.4 — Deploy web

```
Using /coder, prepare apps/web for Vercel deployment. Set up environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY), verify the build passes with pnpm --filter web build, and configure the Vercel project settings.
```

### 8.5 — Build mobile APK

```
Using /coder, configure the Expo build for Android. Set up app.json with the correct package name, permissions (INTERNET, RECEIVE_BOOT_COMPLETED for FCM), and create the EAS build profile. Run eas build --platform android --profile preview for a test APK.
```

---

## Quick Reference: Workflow Cheat Sheet

| Prompt prefix | When to use |
|---|---|
| `Using /architect` | Before major structural changes |
| `Using /security-architect` | Before applying any migration or auth change |
| `Using /coder` | For all implementation work |
| `Using /tester` | When writing tests (always before implementation) |
| `Using /reviewer` | After completing a phase, before merging |
| `Using /designer` | When creating new screens or iterating on UI |
| `Using /e2e` | After a feature is completed to verify end-to-end and write Playwright tests |

---

## Tips

- **Always commit between phases.** Each section above should be 1-3 commits.
- **Run tests after every implementation prompt.** If tests fail, fix before moving on.
- **If a prompt produces too much at once,** break it up: "just do the types first", "now the queries", "now the UI".
- **If you deviate from the architecture,** run `/architect` to update docs/architecture.md immediately.
- **The Supabase MCP is connected.** You can ask to run queries, check schema, or apply migrations directly.
