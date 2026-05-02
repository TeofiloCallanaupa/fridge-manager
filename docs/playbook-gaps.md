# Playbook vs Architecture Gaps

> Cross-reference of `docs/prompt-playbook.md` against `docs/architecture.md`.
> Generated 2026-05-01 after completing Phase 4.2.
> None of these block 4.3–4.6 — they're enhancements to address before Phase 5.

---

## Gap 1: FoodKeeper data never seeded

**Architecture says:** `packages/shared/data/foodkeeper.json` should contain 500+ items from the USDA FoodKeeper database. This static JSON is loaded client-side for fuzzy-match lookup when an item is checked off the grocery list.

**Playbook says:** Nothing. No step creates or loads this file.

**Impact:** The checkout flow currently only uses `default_shelf_days` (tier 3 of the fallback chain). For example, "strawberries" gets the generic produce/fridge default of 5 days instead of the more specific FoodKeeper estimate of 5–7 days. The system works, but expiration estimates are less accurate than designed.

**Where in architecture:** §Expiration Date Strategy → "Shelf-Life Data Source: USDA FoodKeeper" (L312–326)

**Fix:** Add a new step (e.g., 4.7 or a pre-Phase-5 enhancement) to download/format the FoodKeeper dataset and save it to `packages/shared/data/foodkeeper.json`.

---

## Gap 2: No playbook step for FoodKeeper fuzzy match

**Architecture says:** The checkout fallback chain is:
1. User manual override
2. FoodKeeper fuzzy match (item name → shelf life range)
3. `default_shelf_days` table (category + location)
4. `null` if `has_expiration = false`

**Playbook says:** The 4.1 grocery checkout prompt only implements tier 3 and 4. There's no prompt to wire in the fuzzy-match logic against the FoodKeeper JSON.

**Impact:** Even after Gap 1 is fixed (data exists), there's no step to build the matching function or integrate it into the checkout flow. This is a separate piece of work from just seeding the data.

**Where in architecture:** §Expiration Date Strategy → "Fallback chain when an item is checked off" (L318–324)

**Fix:** Add a step to build `fuzzyMatchFoodKeeper(itemName)` in `packages/shared/utils/` and integrate it into the checkout hook between the user override check and the `default_shelf_days` fallback.

---

## Gap 3: `expired` auto-detect logic underspecified in 4.5

**Architecture says:** When a user taps "Tossed it":
- If `discarded_at > expiration_date` → auto-set `discard_reason = 'expired'`
- If `discarded_at <= expiration_date` → set `discard_reason = 'wasted'`

This distinction matters for analytics — "forgot about it" (expired) vs "deliberately threw away" (wasted).

**Playbook says:** Step 4.5 mentions "auto-detect based on expiration_date" but doesn't specify the exact condition. A developer reading just the playbook prompt might not implement the date comparison correctly.

**Where in architecture:** §Discard Flow → "discard_reason has three values" (L283)

**Fix:** Update the 4.5 prompt to explicitly state: "If user taps 'Tossed it' and `now() > expiration_date`, set `discard_reason = 'expired'`. Otherwise set `discard_reason = 'wasted'`."

---

## Gap 4: "Change reason" action missing from 4.5

**Architecture says:** From the Recently Removed list, a user can:
1. **Restore to inventory** — sets `discarded_at = null, discard_reason = null`
2. **Change reason** — switch between "Used it" ↔ "Tossed it" (fixes accidental misclassification)

**Playbook says:** Step 4.5 mentions "undo/restore functionality" but doesn't mention "change reason" as a separate action.

**Where in architecture:** §Discard Flow → "Undo & Correction Actions" (L509–514)

**Fix:** Update the 4.5 prompt to include: "From Recently Removed, allow 'change reason' (tap to toggle consumed ↔ wasted/expired) and 'restore to inventory' as separate actions."

---

## Gap 5: Quick Add to Inventory not covered

**Architecture says:** Users should be able to add items directly to inventory without going through the grocery list. This covers items bought spontaneously, received as gifts, or already in the kitchen.

**Playbook says:** No step mentions this feature. The only way items currently enter inventory is via grocery checkout.

**Where in architecture:** §Checkout Flow → "Quick Add to Inventory" (L404–406)

**Impact:** Without this, a user who comes home with a spontaneous purchase has no way to track it in inventory without first adding it to the grocery list and then checking it off — a clunky workaround.

**Fix:** Add a step (could be part of 4.3 item detail sheet or a new 4.7) to add a "+" FAB or "Add Item" button to the inventory view that opens a form for direct inventory item creation with category, location, and expiration fields.

---

## Gap 6: `architecture.md` "Next Steps" section is stale

**Architecture says:** The "Next Steps (Phased)" section at the bottom (L867–912) has its own phase numbering that doesn't match the playbook. Many items are unchecked that are actually complete (e.g., auth, migrations, grocery list).

**Playbook says:** The playbook has its own phase numbering (0–8) and is the actual source of truth for what's done and what's next.

**Impact:** Someone reading `architecture.md` without the playbook would think auth and grocery list haven't been started. Creates confusion.

**Fix:** Either update the architecture's Next Steps to match the playbook status, or replace that section with a pointer: "See `docs/prompt-playbook.md` for current progress."

---

## Summary

| # | Gap | Severity | When to fix |
|---|-----|----------|-------------|
| 1 | FoodKeeper data not seeded | Medium | Before Phase 5 |
| 2 | FoodKeeper fuzzy match not wired | Medium | Before Phase 5 |
| 3 | `expired` auto-detect underspecified | Low | When writing 4.5 |
| 4 | "Change reason" action missing | Low | When writing 4.5 |
| 5 | Quick Add to Inventory missing | Medium | After 4.6 or as 4.7 |
| 6 | architecture.md stale phases | Low | Anytime |
