---
description: TDD workflow for writing and running tests. Use before implementing any feature — write the test first, then the code.
---

# Tester Workflow

## TDD Process
1. **Write the test** — define what the function should do
2. **Run it** — verify it fails (red)
3. **Write the code** — minimal implementation to pass
4. **Run it** — verify it passes (green)
5. **Refactor** — clean up, then run tests again

## Testing stack

| Layer | Tool | Command |
|---|---|---|
| Unit tests (shared) | Vitest | `pnpm --filter shared test` |
| Component tests (web) | React Testing Library | `pnpm --filter web test` |
| Component tests (mobile) | React Native Testing Library | `pnpm --filter mobile test` |
| E2E tests (web) | Playwright | `pnpm --filter web test:e2e` |
| E2E tests (mobile) | Manual | Test on real device |

## What to test first (priority order)

### 1. Shared utilities (packages/shared)
```
utils/__tests__/expiration.test.ts
  ✓ calculateExpiration returns correct date for produce in fridge
  ✓ calculateExpiration returns null for household items
  ✓ calculateExpiration falls back to category default when no FoodKeeper match
  ✓ getDaysSince returns 0 for today
  ✓ getDaysSince returns correct count for past dates
  ✓ getExpirationColor returns 'green' for >3 days
  ✓ getExpirationColor returns 'yellow' for 1-3 days
  ✓ getExpirationColor returns 'red' for expired
  ✓ getExpirationColor returns null for items without expiration
  ✓ formatRelativeTime returns "just now" for <1 min
  ✓ formatRelativeTime returns "2 hours ago"
  ✓ formatRelativeTime returns "yesterday"
```

### 2. Checkout flow logic
```
  ✓ checking a grocery item creates an inventory item
  ✓ inventory item gets correct location from category default
  ✓ inventory item gets expiration from FoodKeeper > default_shelf_days > null
  ✓ items with destination='none' (household) don't create inventory items
  ✓ checked_by and checked_at are set correctly
```

### 3. Discard flow logic
```
  ✓ discard with 'used' sets reason to 'consumed'
  ✓ discard after expiration_date sets reason to 'expired'
  ✓ discard before expiration_date with 'tossed' sets reason to 'wasted'
  ✓ discarded items appear in Recently Removed
  ✓ undo within time window restores the item
```

### 4. RLS policies (integration tests)
```
  ✓ user can read items from their household
  ✓ user cannot read items from another household
  ✓ user can write items to their household
  ✓ user cannot write items to another household
  ✓ invite creates correct household_members entry
```

## E2E critical paths (Playwright)
1. **Auth flow:** Sign up → set display name → create household
2. **Grocery flow:** Add item → verify category grouping → check off → verify in inventory
3. **Inventory flow:** View items → verify color-coded expiration → open detail sheet
4. **Discard flow:** Mark as used → verify in Recently Removed → undo
5. **Restock flow:** Discard → accept restock prompt → verify in grocery list

## Test file locations
```
packages/shared/utils/__tests__/    → Unit tests for shared logic
apps/web/__tests__/components/      → Web component tests
apps/web/__tests__/e2e/             → Playwright E2E specs
apps/mobile/__tests__/components/   → Mobile component tests
```

## Rules
- Every new utility function in `packages/shared` must have tests BEFORE the implementation
- Every bug fix must include a regression test
- Run `pnpm test` before committing
- E2E tests cover the happy path; unit tests cover edge cases
