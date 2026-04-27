# Design System: Fridge Manager — "Heirloom Pantry"

> Generated from Stitch project `17328508936189160962`, design system `b8bcc18c33574bc5a4b82e92a1ebfb75`

---

## 1. Visual Theme & Atmosphere

A warm, approachable daily-use utility app that evokes the feeling of a well-organized pantry — where every item has its place, and the environment feels curated rather than cluttered. The UI follows an **Editorial Layout** philosophy: intentional asymmetry, high-contrast typography scales, and a "layered paper" aesthetic. Like a premium culinary magazine: breathable, sophisticated, and deeply functional.

- **Density:** 6 (Daily App Balanced)
- **Variance:** 4 (Offset Asymmetric)
- **Motion:** 5 (Fluid CSS)

---

## 2. Color Palette & Roles

### Primary Surfaces
- **Warm Canvas** (#F9F9F7) — Primary background surface, slightly warm off-white
- **Pure Surface** (#FFFFFF / `surface-container-lowest`) — Card and container fill
- **Subtle Ground** (#F4F4F2 / `surface-container-low`) — Section backgrounds, intermediate layer
- **Soft Divider** (#EEEEEC / `surface-container`) — Elevated container backgrounds

### Text & Ink
- **Charcoal Ink** (#1A1C1B / `on-surface`) — Primary text, near-black (never pure #000)
- **Deep Forest** (#002111 / `on-primary-fixed`) — Strongest emphasis text
- **Muted Steel** (#5E6572 / `on-secondary-container`) — Secondary text, metadata, quantities
- **Sage Outline** (#707972 / `outline`) — Tertiary text, timestamps

### Accent Colors
- **Forest Green** (#3B7A57 / `primary-container`) — Primary accent for CTAs, checkmarks, active nav, FAB
- **Deep Forest** (#206140 / `primary`) — Darker accent for pressed states
- **Mint Wash** (#AFF1C6 / `primary-fixed`) — Light green tint for "Fresh" status chips
- **Pale Mint** (#93D5AC / `primary-fixed-dim`) — Subtle green highlights

### Semantic Status Colors
- **Fresh Green** (#22C55E) — Items with >3 days until expiration
- **Amber Warning** (#F59E0B) — Items with 1-3 days until expiration
- **Coral Expired** (#EF4444) — Items past expiration date
- **Error Red** (#BA1A1A / `error`) — System error states
- **Error Container** (#FFDAD6 / `error-container`) — "Expired" chip backgrounds

### Secondary & Tertiary
- **Cool Secondary** (#DCE2F3 / `secondary-container`) — Secondary buttons, cool counterpoint
- **Tertiary Blue** (#596DA1 / `tertiary-container`) — Tertiary accents, informational

### Constraints
- Maximum 1 accent color. Saturation < 80%
- No purple/neon gradients — strictly banned
- Never use pure black (#000000)

---

## 3. Typography Rules

- **Font Family:** Plus Jakarta Sans — bridges geometric modernism and approachable warmth
- **Display:** Semi-bold, track-tight, for empty states and milestone numbers
- **Headlines:** `headline-lg` and `headline-md` with generous leading — creates "chapter" feel for sections
- **Body:** `body-lg` for item names, relaxed leading, max 65ch width
- **Labels:** `label-md` in Muted Steel (#5E6572) for metadata — quantities, expiry dates, timestamps
- **Mono:** JetBrains Mono for counters, quantities, and high-density numbers

### Banned
- Inter font
- Generic serif fonts (Times, Georgia, Garamond)
- System default fonts in premium contexts

---

## 4. Component Stylings

### Buttons
- **Primary:** Pill-shaped (`rounded-full`), Forest Green gradient (135° from #206140 to #3B7A57), white text
- **Secondary:** Cool Secondary (#DCE2F3) background, Muted Steel text
- **Active State:** Tactile -1px translate on press. No neon outer glows

### Cards & Lists
- **Card Rule:** 1.5rem (xl) border radius on all cards
- **No Dividers:** Separation through 16-24px vertical whitespace, never 1px borders
- **Tonal Layering:** Cards (#FFFFFF) on section backgrounds (#F4F4F2) — natural lift without shadows
- **Ambient Shadow (float):** `box-shadow: 0px 12px 32px rgba(26, 28, 27, 0.06)` — tinted to on-surface

### Checkboxes (Grocery List)
- **Unchecked:** Hollow circle with thin outline-variant border
- **Checked:** Filled Forest Green circle with white checkmark icon
- **Animation:** Spring physics fill on check (stiffness: 100, damping: 20)

### Category Headers
- Emoji icon + category name in semi-bold
- Item count badge: pill-shaped, Forest Green background, white text

### Status Chips
- **Fresh:** `primary-fixed` (#AFF1C6) background, small label text
- **Expiring:** Amber (#F59E0B) background
- **Expired:** `error-container` (#FFDAD6) background

### Inputs
- Bottom-line only OR enclosed in `surface-container-highest` (#E2E3E1) block, no visible border
- Label above, error below. Focus ring in Forest Green

### Sync Indicator
- Subtle green dot + "Synced" label in Sage Outline color
- Cloud icon for pending sync states

### FAB (Floating Action Button)
- Forest Green (#3B7A57) circle, white "+" icon
- Glassmorphism: 80% opacity surface with 20px backdrop-blur
- Bottom-right position, elevated with ambient shadow

### Bottom Navigation
- 3 tabs: Grocery (🛒), Inventory (🏠), Settings (⚙️)
- Active: Forest Green icon + label with subtle indicator pill
- Inactive: Muted gray icon + label

---

## 5. Layout Principles

- **Mobile-first** single-column layout, strict single-column collapse below 768px
- **Category-grouped sections** with collapsible headers
- **Checked items** collapse to bottom of their category section
- **32px side margins** — high-end design needs room to breathe
- **Touch targets** minimum 44px
- **No horizontal scroll** on any viewport
- **Max-width containment** on larger screens

### The "No-Line" Rule
Separation achieved through background shifts (surface tiers) and tonal transitions, NEVER 1px solid borders.

---

## 6. Motion & Interaction

- **Spring Physics:** `stiffness: 100, damping: 20` — premium, weighty feel
- **Check-off Animation:** Circular fill with spring physics, text strikethrough slide
- **Staggered Reveals:** Cascade delays on list items for waterfall effect
- **Category Collapse:** Smooth height animation when all items checked
- **Performance:** Animate exclusively via `transform` and `opacity`

---

## 7. Anti-Patterns (Banned)

- No emojis in UI chrome (emojis ONLY for category labels in grocery list)
- No Inter font
- No pure black (#000000)
- No neon/outer glow shadows
- No oversaturated accents
- No 1px solid borders for section separation
- No 3-column equal card layouts
- No generic names ("John Doe", "Acme")
- No AI copywriting clichés ("Elevate", "Seamless", "Next-Gen")
- No filler UI text ("Scroll to explore", scroll arrows)
- No broken image links — use DiceBear SVG avatars
- No circular loading spinners — use skeletal shimmer loaders
