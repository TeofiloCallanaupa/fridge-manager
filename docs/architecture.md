# Fridge Manager - Architecture Notes

> Decision notes from April 25-26, 2026. See [[fridge-manager]] for the core feature spec.

---

## Key Decisions

- **Two frontends, one backend.** Expo (React Native) for Android, Next.js for web. Shared Supabase backend.
- **React Native for mobile** because push notifications are critical and native FCM is the most reliable way to deliver them. PWA Web Push was considered but rejected for this reason.
- **Next.js for web** because the app needs to be accessible from a laptop too, and a dedicated web frontend with SSR provides a better experience than Expo's web export.
- **Supabase Auth** (magic links or email/password). Dropped NextAuth + Google OAuth because Google OAuth requires Cloud Console setup, consent screen config, and manually whitelisting test user emails.
- **Supabase for the database** (free tier: 500MB, 50K MAU auth). Postgres is a natural fit for relational data. Real-time subscriptions built in.
- **Supabase pg_cron + Edge Functions** for the daily expiration check cron job. Keeps everything in Supabase instead of burning Vercel's 2 free cron slots.
- **Offline support via WatermelonDB** for the mobile app. Grocery store reception is spotty, the app must work offline. WatermelonDB provides local SQLite with background sync to Supabase.

## Stack

```
Mobile:     Expo (React Native) + WatermelonDB → Play Store / APK sideload
Web:        Next.js (App Router) → Vercel (free tier)
Backend:    Supabase (Auth + Postgres + Realtime + Edge Functions + pg_cron)
Push:       Firebase Cloud Messaging (Android native)
Mobile UI:  React Native Paper (Material Design 3)
Web UI:     shadcn/ui + Tailwind CSS
State:      TanStack Query (server state) + React Context (auth/household)
Charts:     Victory (victory on web, victory-native on mobile) — same API, same visuals
Avatars:    DiceBear (Avataaars style) — sprite avatar creator, stored as JSON config
Testing:    Vitest (unit) + Playwright (e2e web) + Testing Library (components)
Errors:     Sentry (free tier)
```

**Total cost: $0**

### State Management (No Redux)

| Concern | Solution |
|---------|----------|
| Server state (fetching, caching, refetching) | **TanStack Query (React Query)** |
| Real-time data | **Supabase Realtime** subscriptions |
| Local offline data (mobile) | **WatermelonDB** (its own reactive system) |
| Auth / current household | **React Context** |
| Form state | Local `useState` |

Redux is not used. It adds boilerplate (actions, reducers, selectors) without solving a problem that these tools don't already handle.

Both frontends share:
- The same Supabase backend (auth, database, realtime)
- TypeScript types/interfaces via `packages/shared`
- The same business logic (utility functions, constants)

---

## Auth & Onboarding Flow

1. User signs up with email/password (or magic link)
2. User sets their **display name** (stored in `profiles.display_name`)
3. User creates a household (gives it a name, sets timezone)
4. User invites another person by email
5. Invited person gets an email, signs up (or logs in if they already have an account), sets their display name, **creates their avatar**, and joins the household
6. Both users now share the same grocery list and fridge

### How Invites Work

1. User A enters User B's email → creates a `household_invites` row with `status = 'pending'`
2. A Supabase Edge Function sends an email to User B with a link to the app containing the invite token
3. User B clicks the link, signs up (or logs in)
4. App checks for pending invites matching User B's email → auto-joins them to the household
5. Invite status updated to `'accepted'`
6. Invites expire after 7 days (`expires_at`)

### Why Supabase Auth

| Option | Why not |
|--------|---------|
| **NextAuth + Google OAuth** | Requires Google Cloud Console setup, OAuth consent screen, manually adding test user emails to the access list. Overkill for a personal app. |
| **Auth0** | Powerful but adds a whole external service and dashboard. Built for enterprise features (FGA, CIBA, MFA) we don't need here. |
| **Clerk** | Free 10K MAU, prettiest UI, but another vendor dependency for a 2-person app. |

Supabase Auth wins because it's already part of the stack. No extra service, no extra dashboard. Auth and database live in the same place.

---

## Data Model

### Core Tables

```sql
-- User profile (auto-created via Supabase trigger on auth.users insert)
profiles (
  id uuid PK FK → auth.users,
  display_name text,
  avatar_config jsonb,            -- DiceBear Avataaars config (hair, eyes, skin, etc.) — rendered on demand, no image storage
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

-- A household is the shared unit (apartment, house, etc.)
households (
  id uuid PK default gen_random_uuid(),
  name text not null,           -- "Teo & Emilia's Apartment"
  timezone text not null default 'America/New_York',  -- IANA timezone, set to where the fridge is
  created_by uuid FK → auth.users,
  created_at timestamptz default now(),
  updated_at timestamptz default now()  -- auto-updated via trigger
)

-- Many-to-many: users ↔ households (supports multi-household from day one)
household_members (
  id uuid PK default gen_random_uuid(),
  household_id uuid FK → households,
  user_id uuid FK → auth.users,
  role text default 'member',   -- 'owner' | 'member'
  joined_at timestamptz default now(),
  updated_at timestamptz default now(),  -- auto-updated via trigger (tracks role changes)
  UNIQUE(household_id, user_id),
  CHECK (role IN ('owner', 'member'))
)

-- Invite someone to a household by email
household_invites (
  id uuid PK default gen_random_uuid(),
  household_id uuid FK → households,
  invited_by uuid FK → auth.users,
  invited_email text not null,
  status text default 'pending', -- 'pending' | 'accepted' | 'expired'
  created_at timestamptz default now(),
  expires_at timestamptz default now() + interval '7 days',
  CHECK (status IN ('pending', 'accepted', 'expired'))
)

-- Food categories with display order and defaults
-- GLOBAL TABLE: no household_id, shared across all households. RLS: public SELECT, no client writes.
categories (
  id uuid PK default gen_random_uuid(),
  name text not null UNIQUE,       -- 'produce', 'dairy', 'meat', 'household', 'snacks', etc.
  emoji text,                      -- '🥬', '🥛', '🥩', '🧹'
  display_order int not null,      -- controls sort in grocery list view
  default_destination text,        -- 'fridge' | 'freezer' | 'pantry' | 'none'
  has_expiration boolean default true,  -- false for 'household' category
  CHECK (default_destination IN ('fridge', 'freezer', 'pantry', 'none'))
)

-- Seed data for categories:
-- ('produce',    '🥬', 1, 'fridge',   true)
-- ('dairy',      '🥛', 2, 'fridge',   true)
-- ('meat',       '🥩', 3, 'fridge',   true)
-- ('bakery',     '🍞', 4, 'pantry',   true)
-- ('frozen',     '🧊', 5, 'freezer',  true)
-- ('snacks',     '🍿', 6, 'pantry',   true)
-- ('beverages',  '🥤', 7, 'fridge',   true)
-- ('condiments', '🧂', 8, 'pantry',   true)
-- ('leftovers',  '🍲', 9, 'fridge',   true)
-- ('household',  '🧹', 10, 'none',    false)

-- The grocery shopping list
grocery_items (
  id uuid PK default gen_random_uuid(),
  household_id uuid FK → households,
  name text not null,
  quantity text,                  -- "2 lbs", "1 dozen", "3"
  category_id uuid FK → categories,
  destination text,               -- 'fridge' | 'freezer' | 'pantry' | 'none' (defaults from category)
  checked boolean default false,
  added_by uuid FK → auth.users,
  checked_by uuid FK → auth.users,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),  -- auto-updated via trigger (required for WatermelonDB sync)
  checked_at timestamptz,
  completed_at timestamptz,       -- set when checked off; null = active. Keeps row for purchase history analytics.
  CHECK (destination IN ('fridge', 'freezer', 'pantry', 'none'))
)

-- Items in the household (fridge, freezer, pantry)
inventory_items (
  id uuid PK default gen_random_uuid(),
  household_id uuid FK → households,
  name text not null,
  quantity text,
  category_id uuid FK → categories,
  location text not null,         -- 'fridge' | 'freezer' | 'pantry'
  expiration_date date,           -- null when category.has_expiration = false
  expiration_source text,         -- 'user' | 'default' | null (how the expiration was set)
  added_by uuid FK → auth.users,
  added_at timestamptz default now(),
  updated_at timestamptz default now(),  -- auto-updated via trigger (required for WatermelonDB sync)
  discarded_at timestamptz,       -- null = still in inventory, set when tossed/consumed
  discard_reason text,            -- 'consumed' | 'expired' | 'wasted' (see Discard Flow for logic)
  source text default 'manual',   -- 'manual' | 'grocery_checkout'
  CHECK (location IN ('fridge', 'freezer', 'pantry')),
  CHECK (discard_reason IN ('consumed', 'expired', 'wasted')),
  CHECK (source IN ('manual', 'grocery_checkout')),
  CHECK (expiration_source IN ('user', 'default'))
)

-- Default shelf life by food category (used for auto-estimating expiration dates)
default_shelf_days (
  id uuid PK default gen_random_uuid(),
  category_id uuid FK → categories,
  location text not null,         -- 'fridge' | 'freezer' | 'pantry'
  shelf_days int not null,        -- default days until expiration
  UNIQUE(category_id, location)
)

-- Seed data for default_shelf_days (category_id references categories by name for readability):
-- (produce,    'fridge',   5)
-- (produce,    'freezer',  180)
-- (dairy,      'fridge',   7)
-- (dairy,      'freezer',  90)
-- (meat,       'fridge',   3)
-- (meat,       'freezer',  120)
-- (leftovers,  'fridge',   4)
-- (leftovers,  'freezer',  90)
-- (bakery,     'pantry',   7)
-- (bakery,     'freezer',  90)
-- (frozen,     'freezer',  180)
-- (snacks,     'pantry',   90)
-- (beverages,  'fridge',   14)
-- (condiments, 'fridge',   180)
-- (condiments, 'pantry',   365)
-- (household,  'pantry',   null)  -- no expiration
```

### Notification Tables

```sql
-- Per-user notification preferences (one row per user per household)
notification_preferences (
  id uuid PK default gen_random_uuid(),
  user_id uuid FK → auth.users,
  household_id uuid FK → households,   -- scoped per household (different prefs per household)
  halfway_enabled boolean default true,
  two_day_enabled boolean default true,
  one_day_enabled boolean default true,
  day_of_enabled boolean default true,
  post_expiration_enabled boolean default true,
  quiet_hours_start time,         -- e.g., '22:00' (no notifications after 10pm)
  quiet_hours_end time,           -- e.g., '08:00' (no notifications before 8am)
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  UNIQUE(user_id, household_id)
)

-- Store each device's push subscription (FCM for mobile, Web Push for browser)
push_subscriptions (
  id uuid PK default gen_random_uuid(),
  user_id uuid FK → auth.users,
  household_id uuid FK → households,   -- scoped per household (route notifications correctly)
  platform text not null,          -- 'android' | 'web'
  token text not null,             -- FCM token (android) or Web Push endpoint (web)
  keys jsonb,                      -- Web Push p256dh + auth keys (null for FCM)
  created_at timestamptz default now(),
  CHECK (platform IN ('android', 'web'))
)

-- Track what notifications were already sent (prevents duplicates)
notification_log (
  id uuid PK default gen_random_uuid(),
  inventory_item_id uuid FK → inventory_items,
  household_id uuid FK → households,
  type text not null,              -- 'halfway' | 'two_day' | 'one_day' | 'day_of' | 'expired'
  sent_at timestamptz default now(),
  CHECK (type IN ('halfway', 'two_day', 'one_day', 'day_of', 'expired'))
)
```

### Observability Table

```sql
-- Cron job run history + system events
system_logs (
  id uuid PK default gen_random_uuid(),
  event text not null,             -- 'cron_run' | 'notification_sent' | 'error'
  details jsonb,                   -- { items_checked: 12, notifications_sent: 3, errors: [] }
  created_at timestamptz default now()
)
```

### Key Design Decisions

- **`has_expiration` lives on the `categories` table only** (not on individual inventory items). Whether an item expires is determined by its category. An inventory item with `expiration_date = null` means "no expiration." This eliminates a redundant field and prevents sync issues.
- **`destination` on `grocery_items`** so the checkout flow knows where items go (fridge, freezer, pantry, or nowhere). Defaults from the category's `default_destination`.
- **`discard_reason` has three values** but the user only sees two buttons ("Used it" / "Tossed it"). The `'expired'` value is auto-set: if `discarded_at > expiration_date` and user taps "Tossed it", it's `'expired'`. If tossed before expiration, it's `'wasted'`. This distinction matters for analytics (forgot about it vs deliberately threw away).
- **`profiles` table** auto-created on signup via Supabase database trigger. Stores display name and avatar.
- **`notification_preferences` is scoped per user per household** (`UNIQUE(user_id, household_id)`) so users can have different notification settings for different households. Separate table from profiles for clean separation.
- **`push_subscriptions` includes `household_id`** so the notification Edge Function can route push messages to the correct household context.
- **`households.timezone`** set to where the fridge physically is (IANA format, e.g., `America/New_York`). Does NOT auto-update when traveling. The fridge doesn't move.
- **`household_members` is many-to-many from day one.** Schema supports multiple households per user without migration.
- **`quiet_hours`** on notification preferences so alerts don't wake you up at night.
- **`default_shelf_days` table** provides smart defaults for expiration dates by category and storage location. When an item is auto-added to inventory via checkout, the expiration date is calculated from `added_at + shelf_days`. Users can override any default.
- **`expiration_source`** tracks whether the expiration date was set by the user or auto-calculated from defaults. Useful for improving defaults over time.
- **"Days since added" counter** displayed on every inventory item regardless of expiration date. Even if an item has no expiration (like a condiment), seeing "added 45 days ago" creates passive awareness.
- **`updated_at` on all synced tables** (`grocery_items`, `inventory_items`, `households`, `household_members`) with an auto-update Postgres trigger. Required for WatermelonDB incremental sync ("give me everything changed since timestamp X").
- **`completed_at` on `grocery_items`** provides soft-delete behavior. When an item is checked off and auto-moved to inventory, `completed_at` is set instead of deleting the row. This preserves purchase history for analytics ("bought 6 times in 3 months"). The grocery list view filters `WHERE completed_at IS NULL`.
- **CHECK constraints on all enum-like text columns** (`discard_reason`, `source`, `location`, `role`, `status`, `platform`, `destination`). Enforces valid values at the database level, not just application code.
- **RLS (Row Level Security) enabled on ALL tables at creation time.** Users can only read/write data for households they belong to. `categories` and `default_shelf_days` are global (public SELECT, no client writes). `system_logs` is service-role only.
- **Seed data uses `ON CONFLICT DO NOTHING`** to prevent duplicate insertion errors during migration re-runs.

---

## Expiration Date Strategy

No AI needed. Expiration dates come from three sources, in order of priority:

| Source | When to use | Example |
|--------|-------------|----------|
| **User-entered** | Packaged items with a printed date (milk, yogurt, canned goods) | User types "May 3" from the carton |
| **Item-specific lookup** | Common foods without a printed date | Strawberries → 5-7 days (from USDA FoodKeeper data) |
| **Category default** | Items not found in the lookup table | Falls back to produce/fridge: 5 days |
| **No expiration** | Non-perishable household items (paper towels, soap, spices) | `has_expiration = false`, no notifications |

### Shelf-Life Data Source: USDA FoodKeeper

The [USDA FoodKeeper](https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/foodkeeper-app) is a free, public dataset maintained by the USDA Food Safety and Inspection Service. It contains shelf life ranges for **500+ specific foods** across fridge, freezer, and pantry storage.

**Storage:** Static JSON file in `packages/shared/data/foodkeeper.json`. Loaded client-side for fuzzy match lookup. No database table needed — the dataset is ~500 items (~50KB), static, and doesn't change per-user.

**Fallback chain when an item is checked off:**
1. Fuzzy match the item name against FoodKeeper JSON data
2. If found → use the conservative end of the shelf life range
3. If NOT found → fall back to `default_shelf_days` table (category + location default)
4. If category `has_expiration = false` → set `expiration_date = null`
5. User can always override the expiration date from the inventory view

**We don't need to predict what the user will buy.** The FoodKeeper database covers the most common groceries, and the category defaults catch everything else. If a user adds something exotic, the category default is a reasonable fallback, and they can edit the date manually.

**Learning over time (future feature):** Track how long items actually last before being discarded. If the household consistently discards strawberries after 3 days (not the default 5), surface a suggestion: "Your strawberries typically last 3 days. Adjust the default?"

**Every item always shows "added X days ago"** regardless of whether it has an expiration date. This means:
- An orange added 4 weeks ago surfaces visually even if the default expiration was conservative
- A condiment added 6 months ago is visible even without a hard expiration
- Users develop awareness of how long things have been sitting

---

## Notification System

### Thresholds

| Threshold | When | Example |
|-----------|------|---------|
| **Halfway** | `added_at + (expiration_date - added_at) / 2` | "Heads up, your strawberries are halfway to expiring" |
| **2-day warning** | `expiration_date - 2 days` | "Your chicken expires in 2 days" |
| **1-day warning** | `expiration_date - 1 day` | "Your milk expires tomorrow, use it today" |
| **Day-of** | `expiration_date = today` | "Your yogurt expires today!" |
| **Post-expiration nag** | Every day after `expiration_date` until `discarded_at` is set | "Your leftover pasta expired 3 days ago, toss it?" |

All thresholds are opt-in/out per user via `notification_preferences`. Quiet hours are respected.

Items with `expiration_date = null` (i.e., their category has `has_expiration = false`) are excluded from all notification checks.

### Timezone Handling

- Notifications fire based on the **household's timezone**, not the user's current location
- The household timezone is set once when the household is created (where the fridge physically lives)
- If you're traveling in a different timezone, you still get alerts at the right time relative to home
- The fridge doesn't move with you

### How It Runs

1. **Supabase pg_cron** triggers daily at a hardcoded UTC time (default: 1pm UTC = 9am ET for a single-household setup)
2. Calls a **Supabase Edge Function** that:
   - Queries `inventory_items` where `discarded_at IS NULL` AND `expiration_date IS NOT NULL` and `expiration_date` hits any threshold today
   - Checks `notification_log` to skip already-sent notifications (except post-expiration nag, which sends daily)
   - Looks up `household_members` for each item's household
   - Checks each member's `notification_preferences` (is this threshold enabled? are we in quiet hours?)
   - Looks up `push_subscriptions` for eligible members
   - Sends **FCM push** to Android devices, **Web Push** to browser subscriptions
   - Writes to `notification_log` and `system_logs`

**Multi-timezone (future):** When multi-household is implemented with different timezones, switch to an hourly cron that queries `WHERE households.timezone` matches the current 9am timezone. Schema already stores timezone per household, so no migration needed.

### Push Delivery

| Platform | Method | Reliability |
|----------|--------|-------------|
| **Android (Expo)** | Firebase Cloud Messaging (native) | Rock solid |
| **Web (Next.js)** | Web Push API (optional, nice-to-have) | Good on desktop Chrome, less critical since phone is the primary device |

---

## Checkout Flow (Grocery List → Inventory)

> Full competitive research in [[fridge-manager-competitive-analysis]]. Summary and decision below.

### Decision: Option B (Auto-Move on Check) with Optional Unpack Mode

Based on research of 8 competitor apps (NoWaste, OurGroceries, AnyList, Listonic, Fridgely, KitchenPal, MealBoard, Pantry Check), **auto-move on check** is the strongest approach. KitchenPal and MealBoard prove it works in production.

**How it works:**
1. Each grocery item has a pre-assigned `destination` (fridge, freezer, pantry, none) and `category`
2. Checking off an item during shopping immediately creates an `inventory_item` in the background
3. Expiration date auto-calculated from `default_shelf_days` table (based on category + location)
4. Items with `destination = 'none'` are simply cleared (paper towels, soap, etc.)
5. No separate "checkout" step — zero extra friction
6. Users can edit expiration dates from the inventory view at any time
7. Unchecked items carry over to the next shopping trip

**Optional "Unpack Mode"** (for users who want more control):
- After shopping, tap "Review Purchases" to see a card-by-card summary
- For each item: confirm/edit location, set exact expiration date, swipe to confirm
- This is optional, not required — auto-move already handled the basics

**Quick Add to Inventory** (skips the grocery list):
- For items bought spontaneously, received as gifts, or already in the kitchen
- Direct add from inventory screen with category, location, and expiration

### Key UX Patterns to Adopt

| Pattern | Source | Priority |
|---------|--------|----------|
| Color-coded expiration (🟢 fresh, 🟡 use soon, 🔴 expired) | NoWaste | Must-have |
| FEFO sort (closest to expiry first) | NoWaste | Must-have |
| Real-time sync speed | OurGroceries | Must-have |
| Auto-move from grocery list to inventory | KitchenPal, MealBoard | Must-have |
| "Days since added" counter on all items | Our idea | Must-have |
| Smart defaults for expiration by category | Industry standard | Must-have |
| Waste tracking stats (consumed vs wasted) | NoWaste | Should-have |
| Auto-restock prompt on discard | NoWaste, Fridgely | Should-have |
| Category-grouped grocery list | AnyList | Should-have |
| Smart autocomplete from purchase history | Listonic | Nice-to-have |
| Barcode scanning | All inventory apps | Future |
| Receipt scanning (AI) | NoWaste.ai, Fridgely | Future |
| Recipe suggestions from inventory | KitchenPal, Fridgely | Future |

---

## Grocery List View

### Category-Grouped Layout

Inspired by AnyList. Instead of a flat list, grocery items are grouped by category so you're not zigzagging the store:

```
🥬 Produce
  [ ] Strawberries (1 lb)
  [ ] Spinach
  [ ] Onions (3)

🥛 Dairy
  [ ] Milk (1 gallon)
  [ ] Greek yogurt

🥩 Meat
  [ ] Chicken breast (2 lbs)
  [ ] Ground beef (1 lb)

🧹 Household
  [ ] Paper towels
  [ ] Dish soap
```

Checked items move to the bottom of their category (or collapse). Categories with all items checked collapse automatically.

Category sort order is controlled by the `categories.display_order` field — one place to manage, not scattered across items.

---

## Item Detail Sheet

Long-press (mobile) or click (web) on any inventory item opens a detail sheet / bottom drawer:

- **Item name** and quantity
- **Category** with emoji
- **Location** (fridge / freezer / pantry)
- **Expiration date** with color indicator and days remaining
- **"Added X days ago"** counter
- **Added by** (display name from profiles)
- **Purchase history:** "You've bought this 6 times in the last 3 months" (from grocery_items history)
- **Actions:**
  - ✏️ Edit (name, quantity, expiration, location)
  - ✅ Mark as used
  - 🗑️ Mark as tossed
  - 🛒 Add to grocery list

---

## Discard Flow (Removing Items from Inventory)

When a user is done with an item (ate it, tossed it, etc.), they need to remove it from the active inventory.

**How it works:**
1. User swipes or taps "Remove" on an inventory item
2. App asks: **"What happened?"**
   - ✅ **Used it** → `discard_reason = 'consumed'`
   - 🗑️ **Tossed it** → `discard_reason = 'wasted'`
3. `discarded_at` is set to **now** (current timestamp, no date picker)
4. Item disappears from active inventory, moves to history
5. App asks: **"Add to grocery list?"** → if yes, creates a new `grocery_item` with the same name, category, destination, and quantity
6. This data feeds the analytics dashboard (waste rate, consumption patterns)

**Why no date picker?** It's always "right now" — you're removing it because you just used it or just tossed it. If you forgot to mark it yesterday, the 1-day difference doesn't meaningfully affect analytics. Keeping it to a single tap maximizes the chance people actually do it.

**All notifications stop** for an item once `discarded_at` is set (regardless of reason — consumed or tossed). This includes halfway, 2-day, 1-day, day-of, and post-expiration nag alerts.

### Recently Removed (Activity Feed)

A "Recently Removed" section visible to all household members. Shows the last ~20 discarded items with:
- Item name
- Who removed it
- When (relative: "2 hours ago", "yesterday")
- Reason icon (✅ used / 🗑️ tossed)

**Why this matters:**
- **Household awareness:** "Oh, Emilia used the chicken yesterday — I should add chicken to the grocery list"
- **Mistake correction:** "I accidentally marked the salmon as tossed, I meant to mark it as used"
- **Accountability:** See who's consuming what, and what's getting wasted

### Undo & Correction Actions

From the Recently Removed list, a user can:
- **Change reason:** Tap to switch between "Used it" ↔ "Tossed it" (fixes the salmon mistake)
- **Restore to inventory:** Put the item back in active inventory (sets `discarded_at = null`, `discard_reason = null`). For when someone accidentally discards an item that's still in the fridge.

No new tables needed — this is just a filtered view of `inventory_items WHERE discarded_at IS NOT NULL` ordered by `discarded_at DESC`.

---

## Offline Support (Mobile)

### Why It's Needed
Grocery stores often have spotty cell reception. If the app doesn't work offline, users can't check off items while shopping — the core use case.

### Approach: WatermelonDB

**Why WatermelonDB, not Kotlin/Room:**
Both ecosystems have mature offline solutions. Kotlin/Room is Android-only (would need a separate iOS and web codebase). WatermelonDB works with React Native (Expo) and provides the same local SQLite storage with background sync. Offline is a solved problem in both ecosystems, so it's not a reason to switch frameworks.

**How it works:**
- WatermelonDB stores a local SQLite copy of the user's data on-device
- All reads/writes hit the local database first (instant, works offline)
- Background sync pushes/pulls changes to/from Supabase when connectivity is available
- Conflict resolution: last-write-wins (fine for a 2-person household)

**What gets cached locally:**
- Grocery list items for the user's household(s)
- Inventory items for the user's household(s)
- Household metadata (name, timezone, members)

**What stays server-only:**
- Notification logic (cron job, push sending)
- System logs
- Auth tokens

---

## Real-Time Sync

Both frontends subscribe to Supabase Realtime channels filtered by `household_id`. When either user adds, checks off, or removes an item, the change appears instantly on the other person's screen.

On mobile, WatermelonDB sync handles this. On web, Supabase Realtime WebSocket handles it directly.

This is critical for the grocery shopping flow — both people at the store checking off items from the same list.

---

## Analytics & Insights

All analytics are derived from existing data in `inventory_items` and `grocery_items`. No price tracking in the MVP — track by **item count**, not dollars.

### Charting
- **Victory** (`victory` on web, `victory-native` on mobile) — same API, same styling, same visual output on both platforms
- Chart configurations shared via `packages/shared` — write once, render identically everywhere

### Analytics Page Layout (Both Platforms)

Two tabs on the analytics page:

**Tab 1: At a Glance** (text stats, loads instantly)
- Waste rate this month: "11% (8 items wasted)"
- Items consumed: 47
- Top wasted category: Dairy (4 items)
- Shopping trips this month: 6
- Average produce shelf life: 4.2 days
- Streak: "3 weeks with <10% waste"

**Tab 2: Charts** (visual trends)
- Line chart: waste rate over time (monthly)
- Bar chart: items wasted by category
- Bar chart: most purchased items
- Line chart: shopping frequency over time

Both tabs share the same data source (Supabase queries via TanStack Query). The "At a Glance" tab is the default — quick to scan on mobile while on the go. The "Charts" tab gives deeper visual insight, especially useful on the web dashboard.

### Monthly Insights

- **Waste rate:** "You wasted 8 items this month (3 produce, 2 dairy, 2 leftovers, 1 meat). That's an 11% waste rate, down from 18% last month."
- **Consumption patterns:** "You bought fish 8 times this month vs 3 times last month"
- **Shelf life accuracy:** "Your produce lasts an average of 4.2 days before being used"
- **Top wasted categories:** "Your most wasted category is dairy (4 items expired)"
- **Shopping frequency:** "You went grocery shopping 6 times this month"

### Year-End Recap

- Top 10 most purchased items
- Most vs least wasted food categories
- Waste rate trend over 12 months
- Seasonal patterns ("You buy more ice cream in July")
- Total items tracked, consumed, wasted

### Why No Dollar Amounts (MVP)

Price tracking was considered and rejected for MVP because:
- **Manual price entry per item** kills the low-friction UX (nobody will type $4.99 for every item)
- **Price databases** are wildly inaccurate (prices vary by store, region, brand, weight, sales)
- **You can buy 1lb or 2lb of beef** at totally different prices, even at the same store
- **Different stores charge different prices** for the same ice cream

Item-count-based tracking is still motivating: "You wasted 8 items this month" is actionable without knowing the dollar amount.

### Price Tracking (Future — via Receipt Scanning)

When receipt scanning is implemented (future feature), prices come for free:
1. User snaps a photo of the receipt after shopping
2. AI (OCR) extracts line items with prices
3. Prices are matched to inventory items
4. Now analytics can show dollar amounts: "You wasted $23 of produce this month"

This adds an optional `price` field to `inventory_items` (nullable, only populated when a receipt is scanned). Zero friction for users who don't scan receipts, bonus data for those who do.

---

## Observability

### Sentry (free tier: 5K errors/month)
- Expo app: catches crashes, unhandled errors, performance issues
- Edge Functions: catches cron job failures
- Get alerted via email if something breaks

### system_logs Table
- Every cron run writes a row: items checked, notifications sent, errors
- Simple query to verify the cron is running: `SELECT * FROM system_logs WHERE event = 'cron_run' ORDER BY created_at DESC LIMIT 10`

### Health Page (in the web app)
- Last cron run timestamp
- Notifications sent in the last 7 days
- Currently expired items (across all households)
- Recent errors
- Waste tracking stats (items consumed vs wasted over time)

---

## Platform Breakdown

### Web (Next.js on Vercel)
- **UI library:** shadcn/ui + Tailwind CSS
- SSR for fast page loads
- Responsive design for laptop and tablet
- Supabase Auth integration via `@supabase/ssr`
- TanStack Query for server state management
- Realtime subscriptions for live grocery list and inventory updates
- Optional: Web Push for browser notifications (nice-to-have, not critical)
- Health/admin dashboard page
- Analytics and waste tracking graphs

### Mobile (Expo on Android)
- **UI library:** React Native Paper (Material Design 3)
- Native FCM push notifications (the primary notification channel)
- Supabase Auth integration via `@supabase/supabase-js`
- WatermelonDB for offline support + local caching
- TanStack Query for server state (when online)
- Realtime sync via WatermelonDB background sync
- Home screen app with native navigation
- Color-coded expiration status on inventory items
- Long-press item detail sheets
- Future: iOS build from the same codebase

### Backend (Supabase)
- Auth (email/password, magic links)
- Postgres database with RLS
- Realtime (WebSocket broadcast on table changes)
- Edge Functions (notification sender, sync endpoint for WatermelonDB)
- pg_cron (daily expiration check trigger)

### Shared Package (`packages/shared`)

```
packages/shared/
  types/
    grocery.ts      → GroceryItem, InventoryItem, Category
    household.ts    → Household, HouseholdMember, HouseholdInvite
    profile.ts      → Profile, NotificationPreferences
    notifications.ts → NotificationType, NotificationLog
  utils/
    expiration.ts   → calculateExpiration(), getDaysSince(), getExpirationColor()
    categories.ts   → getCategoryEmoji(), getDefaultShelfDays()
    formatting.ts   → formatRelativeTime(), formatQuantity()
  constants/
    notifications.ts → NOTIFICATION_THRESHOLDS, QUIET_HOURS_DEFAULT
    categories.ts   → CATEGORY_SEED_DATA
```

Both `apps/mobile` and `apps/web` import from this package. One definition of every type and utility, used everywhere.

---

## Why These Choices

### Two Frontends Over One
- Push notifications are critical → need native FCM → need React Native
- Laptop access is also needed → Expo web export is less polished than Next.js
- SSR matters for the web experience
- This is the standard architecture for apps that need both web and mobile

### Supabase Over Alternatives
- **Firestore**: already know it from Mebot, but Supabase adds a new tool to the portfolio. Data is naturally relational.
- **Neon**: no built-in real-time or auth
- Supabase bundles auth + database + realtime + cron + edge functions in one free service

### Expo Over Kotlin
- **Kotlin**: Android only. Would need SwiftUI for iOS and a separate web app. Three codebases. Room (SQLite ORM) is equivalent to WatermelonDB for offline, so offline support is not a differentiator.
- **Expo**: Android + future iOS from one React Native codebase. Already know React/TypeScript.

---

## Future Features

- **Multi-household support** — schema already supports this, just needs a UI switcher
- **iOS app** — build the Expo iOS target (same codebase as Android)
- **Barcode scanning** — Expo Camera API + product database lookup for auto-filling item names and expiration estimates
- **Receipt scanning + price tracking** — snap a photo of receipt, AI extracts items with prices, matches to inventory. Enables dollar-based waste tracking. Adds optional `price` field to `inventory_items`.
- **Recipe suggestions** — based on what's about to expire ("Your spinach expires in 2 days. Here are 3 recipes.")
- **Smart autocomplete** — learn from past grocery items, suggest frequently bought items
- **Adaptive shelf-life defaults** — track how long items actually last per household and suggest adjusted defaults
- **Year-end recap** — annual summary of purchasing habits, waste trends, seasonal patterns

---

## Testing Strategy

TDD approach: write tests first for business logic and utilities. Component tests for UI. E2E for critical user flows on web.

### Testing Stack

| Layer | Tool | Scope |
|-------|------|-------|
| **Unit tests** | **Vitest** | `packages/shared` utils: `calculateExpiration()`, `getDaysSince()`, `getExpirationColor()`, `formatRelativeTime()`, fuzzy match logic |
| **Component tests (web)** | **React Testing Library** | Web UI components: grocery list rendering, category grouping, item detail sheet |
| **Component tests (mobile)** | **React Native Testing Library** | Mobile UI components: same as web equivalents. Runs in terminal, no emulator needed |
| **E2E (web)** | **Playwright** | Full browser flows: signup → create household → add grocery item → check off → verify in inventory → discard |
| **E2E (mobile)** | **Manual** | Test on real Android device or emulator. No automated mobile E2E for MVP. |

### What Gets Tested First (TDD)

1. **Shared utilities** (highest value, easiest to test)
   - `calculateExpiration(categoryId, location, addedAt)` → returns a date
   - `getDaysSince(addedAt)` → returns number
   - `getExpirationColor(expirationDate)` → returns 'green' | 'yellow' | 'red'
   - `formatRelativeTime(timestamp)` → returns "2 hours ago", "yesterday"
   - FoodKeeper fuzzy match lookup

2. **Supabase RLS policies** (security-critical)
   - Verify users can only read/write their own household's data
   - Verify invite flow creates correct membership

3. **Checkout flow logic**
   - Check off grocery item → inventory item created with correct expiration
   - Items with `destination = 'none'` → no inventory item created
   - Fallback chain: FoodKeeper → default_shelf_days → category default

4. **Discard flow logic**
   - Tossed after expiration → `discard_reason = 'expired'`
   - Tossed before expiration → `discard_reason = 'wasted'`
   - Used it → `discard_reason = 'consumed'`
   - Notifications stop after discard

### E2E Critical Paths (Playwright)

1. **Auth flow:** Sign up → set display name → create household
2. **Grocery flow:** Add item → verify category grouping → check off → verify auto-move to inventory
3. **Inventory flow:** View items → verify color-coded expiration → long-press detail sheet
4. **Discard flow:** Mark as used → verify in Recently Removed → undo
5. **Restock flow:** Discard item → add to grocery list → verify it appears

### No Automated Android E2E (MVP)

Tools like Detox and Maestro exist but are heavy to set up, flaky, and Antigravity can't interact with them (no MCP for Android emulators). React Native Testing Library covers component-level logic without a device. Manual testing on a real phone covers the rest.

### Test File Structure

```
packages/shared/
  utils/__tests__/
    expiration.test.ts
    categories.test.ts
    formatting.test.ts
apps/web/
  __tests__/
    e2e/              → Playwright specs
    components/       → React Testing Library
apps/mobile/
  __tests__/
    components/       → React Native Testing Library
```

## Open Questions

*(All previous open questions have been resolved.)*

- ~~Should the default shelf-life table be user-editable per household?~~ **Resolved: No.** Not needed for MVP. Users can edit expiration dates on individual items. The adaptive learning system (future) handles household-specific adjustments automatically.
- ~~Exact values for the `default_shelf_days` seed data?~~ **Resolved: Import USDA FoodKeeper dataset directly.** 500+ items with fridge/freezer/pantry shelf life ranges. No manual value-picking needed.

### Remaining: Mobile Navigation Structure

~~How should the bottom tab bar be organized?~~ **Resolved: Option B (3-tab + menu)**

| Tab | Content |
|-----|---------|
| 🛒 **Grocery** | Category-grouped shopping list. Main screen. |
| 🏠 **Inventory** | Fridge/freezer/pantry items with color-coded expiration + days since added. Recently Removed section at bottom. |
| ⚙️ **Settings** | Profile (display name, avatar editor), household management, notification preferences, analytics page (At a Glance + Charts tabs). |

---

## UI Design

Design screens BEFORE coding using **Google Stitch** (MCP tool available in Antigravity). This ensures the UI is informed by competitive research and looks polished from the start.

### Approach

1. **Create a Stitch project** with the app's design system (colors, fonts, shapes)
2. **Generate screen mockups** for each core view based on the UX patterns from competitive analysis
3. **Iterate on the designs** before writing any frontend code
4. **Use the finalized designs as reference** during implementation

### Screens to Design

| Screen | Key patterns from competitive research |
|--------|---------------------------------------|
| **Grocery List** | Category-grouped layout (AnyList), real-time sync indicators, check-off animation |
| **Inventory View** | Color-coded expiration 🟢🟡🔴 (NoWaste), FEFO sort, "days since added" counter, location tabs |
| **Item Detail Sheet** | Bottom drawer with item info, actions, purchase history |
| **Discard Flow** | "Used it" / "Tossed it" prompt, restock suggestion |
| **Recently Removed** | Activity feed with avatars, undo actions |
| **Onboarding** | Signup → display name → avatar creator → household setup |
| **Settings** | Profile + avatar editor, household management, notification prefs, analytics |
| **Analytics** | At a Glance tab (text stats) + Charts tab (Victory charts) |

### Design System

- **Mobile:** Material Design 3 via React Native Paper (follows Android conventions)
- **Web:** shadcn/ui components with custom theme
- **Shared:** Same color palette, same expiration color coding (🟢 green = fresh, 🟡 yellow = use soon, 🔴 red = expired), consistent typography

---

## Avatar Creator

Each user creates a customizable sprite avatar during onboarding. Makes the app feel personal — you see your avatar and your partner's avatar throughout the app ("Added by [avatar] Emilia, 3 days ago").

### How It Works

- **Library:** [DiceBear](https://www.dicebear.com/) with the **Avataaars** style
- **Customization options:** hair type, hair color, eye shape, eye color, skin color, facial hair, accessories, tattoos, clothing
- **Storage:** Saved as a JSON config in `profiles.avatar_config` (not an image file)
- **Rendering:** Generated on-demand from the config — both mobile and web render the same avatar from the same JSON
- **Zero storage cost:** No image uploads, no Supabase Storage needed. Just a small JSON object (~200 bytes)

### Where Avatars Appear

- Next to "Added by" on inventory items and grocery items
- In the Recently Removed activity feed ("[avatar] Emilia used the chicken")
- In the item detail sheet
- In the Settings/profile page
- In the household members list

## Next Steps (Phased)

> See `docs/prompt-playbook.md` for current progress and the authoritative source of implementation steps. The Playbook contains the latest status and specific prompts for each phase of development.
