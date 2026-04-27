---
description: Implementation guidelines for writing code. Use when starting any coding task to ensure consistency with architecture and conventions.
---

# Coder Guidelines

## Before writing any code
1. Read `docs/architecture.md` — understand the full system
2. Check which phase you're in (Phase 0-5) and stay scoped to it
3. Read existing code in the area you're modifying
4. Write tests FIRST (TDD) — see `/tester` workflow

## Conventions

### File organization
```
packages/shared/
  types/           → TypeScript interfaces matching DB schema
  utils/           → Pure functions (calculateExpiration, getDaysSince, etc.)
  constants/       → Category lists, color thresholds, notification types
  data/            → FoodKeeper JSON dataset
  utils/__tests__/ → Vitest unit tests

apps/web/          → Next.js App Router + shadcn/ui + Tailwind
apps/mobile/       → Expo + React Native Paper (Material Design 3)
supabase/
  migrations/      → Sequential SQL migrations (001_, 002_, etc.)
```

### Naming
- **Files:** kebab-case (`expiration-utils.ts`, `grocery-list.tsx`)
- **Components:** PascalCase (`GroceryItem`, `ExpirationBadge`)
- **Functions:** camelCase (`calculateExpiration`, `getDaysSince`)
- **Types:** PascalCase with descriptive names (`InventoryItem`, `GroceryItem`, `HouseholdMember`)
- **Constants:** UPPER_SNAKE_CASE (`EXPIRATION_COLORS`, `DEFAULT_CATEGORIES`)

### Code patterns
- Business logic goes in `packages/shared` — NEVER duplicate between web and mobile
- Use TanStack Query for server state (fetching, caching, mutations)
- Use Supabase Realtime for live updates (grocery list, inventory)
- Use React Context for auth and current household only
- No Redux. No Zustand. No MobX.
- Prefer `async/await` over `.then()` chains
- All Supabase queries go through typed client helpers

### Database
- Always use parameterized queries (Supabase client handles this)
- Never write raw SQL in frontend code
- Migration files are numbered sequentially: `001_initial_schema.sql`, `002_seed_categories.sql`
- Seed data uses `ON CONFLICT DO NOTHING`

### Error handling
- Wrap Supabase calls in try/catch with meaningful error messages
- Use Sentry for error tracking (when set up in Phase 5)
- Show user-friendly error messages, log detailed errors

## Don'ts
- ❌ Don't install libraries not in the architecture doc without asking
- ❌ Don't create new database tables without updating the architecture
- ❌ Don't put business logic in components — extract to hooks or shared utils
- ❌ Don't hardcode category names, shelf days, or colors — use constants/DB
- ❌ Don't skip writing tests
