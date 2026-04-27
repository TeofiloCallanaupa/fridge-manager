---
description: Review system architecture, schema design, data flow, and API surfaces. Use when making structural changes or before starting a new phase.
---

# Architect Review

## Before starting
1. Read `docs/architecture.md` — this is the source of truth
2. Read `docs/competitive-analysis.md` — understand what competitors do well/poorly

## Review checklist

### Data Model
- [ ] All tables have proper FK constraints (no orphans)
- [ ] `categories` table is normalized (not enums)
- [ ] `inventory_items` and `grocery_items` are separate tables (not unified)
- [ ] `default_shelf_days` has UNIQUE(category_id, location)
- [ ] All user-facing tables have `household_id` for RLS isolation
- [ ] `profiles.avatar_config` is JSONB (not a separate table)

### Cross-Platform Consistency
- [ ] Business logic lives in `packages/shared` (not duplicated in apps/)
- [ ] Types/interfaces are shared via `packages/shared/types/`
- [ ] Utility functions (`calculateExpiration`, `getDaysSince`, etc.) are in `packages/shared/utils/`
- [ ] Constants (categories, colors, thresholds) are in `packages/shared/constants/`
- [ ] FoodKeeper data is in `packages/shared/data/foodkeeper.json`

### State Management
- [ ] Server state uses TanStack Query (not Redux)
- [ ] Real-time data uses Supabase Realtime subscriptions
- [ ] Auth/household context uses React Context
- [ ] Mobile offline uses WatermelonDB
- [ ] No Redux anywhere

### Navigation & UX
- [ ] 3-tab bottom nav: Grocery, Inventory, Settings
- [ ] Analytics lives inside Settings (not its own tab)
- [ ] Checkout is "auto-move on check" (not a separate flow)
- [ ] Discard is "Used it" / "Tossed it" (single tap)

### Expiration Logic
- [ ] Three-tier fallback: User manual > FoodKeeper fuzzy match > default_shelf_days
- [ ] Items with `category.has_expiration = false` get `expiration_date = null`
- [ ] Color coding: 🟢 green (>3 days), 🟡 yellow (1-3 days), 🔴 red (expired)
- [ ] "Days since added" always shown regardless of expiration

## Output format
Produce a summary with:
1. ✅ Items that are consistent
2. ⚠️ Items that need attention (with file references)
3. ❌ Items that violate the architecture
4. Recommendations for structural improvements
