---
description: Use Stitch MCP to design and iterate on UI screens. Use before implementing frontend components to establish visual direction.
---

# UI Designer

## Before starting
1. Read `docs/architecture.md` — focus on Navigation, Avatar Creator, and UI Design sections
2. Read `docs/competitive-analysis.md` — understand what patterns work from competitors
3. Review the design system: Material Design 3 (mobile), shadcn/ui (web)

## Design system
- **Mobile:** React Native Paper (Material Design 3) — follows Android conventions
- **Web:** shadcn/ui + Tailwind CSS — clean, accessible components
- **Shared colors:**
  - 🟢 Fresh: items with >3 days until expiration
  - 🟡 Use soon: items with 1-3 days until expiration
  - 🔴 Expired: items past expiration date
  - Neutral: items without expiration (household category)

## Screens to design (using Stitch MCP)

### Priority 1: Core screens
1. **Grocery List** — category-grouped, real-time sync indicators, check-off animations
2. **Inventory View** — location tabs (fridge/freezer/pantry), color-coded expiration, "X days ago" badges
3. **Item Detail Sheet** — bottom drawer with item info, edit, discard actions

### Priority 2: Flows
4. **Discard Flow** — "Used it" / "Tossed it" prompt with restock suggestion
5. **Recently Removed** — activity feed with avatars and undo
6. **Add Item** — quick-add with category picker and destination selector

### Priority 3: Settings & onboarding
7. **Onboarding** — signup → display name → avatar creator → household setup
8. **Settings** — profile, avatar editor, household management, notifications, analytics
9. **Analytics** — "At a Glance" tab (text stats) + "Charts" tab (Victory charts)

## Stitch workflow
1. Create a Stitch project for Fridge Manager
2. Set up design system (colors, typography, shapes)
3. Generate screens one at a time, starting with Priority 1
4. Iterate based on feedback
5. Export finalized designs as reference for implementation

## Design principles (from competitive analysis)
- **AnyList pattern:** Category-grouped grocery lists with collapsible sections
- **NoWaste pattern:** Color-coded expiration with FEFO sorting
- **Simplicity:** Maximum 2 taps for any common action
- **Mobile-first:** Design for phone screen, adapt to web
- **Personal:** Avatars visible throughout the app ("Added by [avatar] Emilia")
