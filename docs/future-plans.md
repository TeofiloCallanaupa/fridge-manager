# Future Plans

> Ideas and expansion paths for Fridge Manager. Updated as plans solidify.

---

## 1. Payments — Premium Household Features

**What:** Monetize via a freemium model — free tier for single households,
paid tier for multi-household management, analytics dashboards, or extended
history retention.

**Tech approach:**
- **Phase 1:** Supabase Edge Function handling Stripe webhooks (checkout.session.completed,
  invoice.paid, customer.subscription.deleted). No custom backend needed.
- **Phase 2:** If billing logic grows complex (metered usage, family plans, refund
  workflows), introduce a lightweight FastAPI or Express service specifically for
  payment orchestration.

**DB impact:**
- Add `subscriptions` table (plan, status, stripe_customer_id, current_period_end)
- Add RLS policy: premium features check subscription status
- Edge Function verifies Stripe webhook signatures and upserts subscription records

**When to start:** After core feature set is stable and user base exists.

---

## 2. MCP Server — AI-Native Fridge Access

**What:** Expose Fridge Manager as an MCP (Model Context Protocol) server so AI
assistants (Claude, Gemini, ChatGPT) can directly interact with your fridge data.

**Example AI interactions:**
- *"What's expiring this week?"* → queries inventory_items with expiration filter
- *"Add milk and eggs to the grocery list"* → inserts into grocery_items
- *"What did we waste last month?"* → queries removal history
- *"Suggest meals based on what's in the fridge"* → reads inventory + calls recipe API

**Tech approach:**
- MCP server in TypeScript (Node.js) using the MCP SDK
- Authenticates to Supabase with a **scoped service key** or user-delegated OAuth token
- Exposes tools: `list_inventory`, `add_grocery_item`, `check_expiring`, `get_waste_report`
- RLS still enforces household isolation — the MCP server passes the user's JWT

**Architecture:**
```
AI Assistant → MCP Protocol → MCP Server (TS)
                                  ↓
                              Supabase SDK
                                  ↓
                              PostgREST → Postgres (with RLS)
```

**Why this works with our current stack:**
- The Supabase client SDK is the same one our web app uses
- No new API layer needed — MCP server reuses existing query patterns
- RLS ensures the AI can only access data the authenticated user owns

**When GraphQL might enter:**
If the MCP server needs to serve multiple AI platforms with different data shape
requirements, a GraphQL layer between the MCP server and Supabase could act as
a flexible schema contract. Not needed initially.

---

## 3. Public REST API — Third-Party Integrations

**What:** A documented, versioned API that lets third-party apps integrate with
Fridge Manager (smart fridge hardware, meal planning apps, grocery delivery services).

**Tech approach:**
- Supabase Edge Functions as the API gateway (versioned: `/v1/inventory`, `/v1/grocery`)
- API key authentication (not user JWT — these are machine-to-machine)
- Rate limiting via Supabase's built-in or Cloudflare
- OpenAPI spec auto-generated for documentation

**Complements MCP:** The public API handles traditional REST integrations while
the MCP server handles AI-native interactions. Both talk to the same Supabase backend.

---

## 4. Offline-First with Sync

**What:** Full offline support — add items, check off groceries, and discard
inventory while disconnected. Changes sync when back online.

**Tech approach:**
- **PowerSync** or **ElectricSQL** — both integrate with Supabase/Postgres
- Local SQLite database on the device syncs bidirectionally with Postgres
- Conflict resolution via last-write-wins or custom merge logic

**When to start:** When users report connectivity issues or the app targets
mobile-first markets.

---

## 5. Mobile App (React Native)

**What:** Native iOS/Android app using the same shared package and Supabase backend.

**Tech approach:**
- React Native or Expo
- Reuse `@fridge-manager/shared` (types, utils, FoodKeeper data)
- Same Supabase client SDK
- This is where GraphQL would add the most value — mobile and web clients
  could query different data shapes from the same backend

**When to start:** After the PWA proves the concept and user demand exists
for a native experience (push notifications, home screen widget, camera for
barcode scanning).

---

## Priority Order

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| 🟢 Near | MCP Server | Medium | High — differentiator, AI-native |
| 🟡 Mid | Payments | Medium | Medium — monetization path |
| 🟡 Mid | Public API | Medium | Medium — ecosystem play |
| 🔵 Later | Offline sync | High | High — but needs user demand signal |
| 🔵 Later | Mobile app | High | High — but PWA may suffice |
