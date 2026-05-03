# Technology Decisions — Why We Chose What We Chose

> A plain-language explanation of every major technology choice in Fridge Manager,
> what alternatives exist, and why they didn't make the cut.

---

## The Big Picture

Fridge Manager is a **household inventory PWA** — a web app that feels like a native
mobile app. The core requirement is simple CRUD (create, read, update, delete) with
real-time sync, auth, and offline-friendly behavior. There's no complex business
logic server-side, no ML pipeline, no heavy computation. This context drives every
decision below.

```
┌─────────────┐     ┌──────────────────┐     ┌──────────┐
│  Next.js     │────▶│  Supabase        │────▶│ Postgres │
│  (React)     │     │  (BaaS)          │     │ (DB)     │
│              │     │  - Auth          │     └──────────┘
│  TanStack    │     │  - PostgREST     │
│  Query       │     │  - Realtime      │
│  shadcn/ui   │     │  - Edge Funcs    │
└─────────────┘     └──────────────────┘
```

No custom backend server. The browser talks directly to Supabase.

---

## 1. Supabase vs. Building a Custom Backend

### What Supabase gives us (for free)

| Feature | What it replaces |
|---------|-----------------|
| **Auth** | Building login/signup/OAuth/JWT refresh from scratch |
| **PostgREST** | Writing CRUD API endpoints (Express/FastAPI routes) |
| **Row Level Security** | Writing authorization middleware |
| **Realtime** | Setting up WebSocket server + pub/sub |
| **Storage** | File upload service (S3 + signed URLs) |
| **Edge Functions** | Serverless functions when you need custom logic |
| **Studio** | Admin dashboard / DB GUI |

### Why not FastAPI / Express / Django?

A custom backend (like FastAPI) would mean:

```
Browser → FastAPI → PostgreSQL
```

You'd need to:
1. **Write every endpoint by hand** — `POST /api/grocery-items`, `GET /api/inventory`, etc.
2. **Handle auth yourself** — JWT generation, refresh tokens, password hashing, email verification
3. **Write authorization logic** — "can this user access this household's items?"
4. **Deploy and maintain a server** — Docker, hosting, scaling, monitoring
5. **Handle CORS, rate limiting, input validation** — boilerplate for every route

With Supabase, you get all of that by defining **database tables + RLS policies**.
The API is auto-generated from your schema. Auth is a service. Authorization is SQL.

#### When you WOULD pick FastAPI/Express:

- **Complex business logic** — ML models, payment processing, third-party API orchestration
- **Custom data transformations** — the API response shape is very different from the DB schema
- **Multi-database** — you need to aggregate data from Postgres + Redis + ElasticSearch
- **Team has backend engineers** — people who prefer writing Python/Go over SQL

#### Why it doesn't apply to us:

Our app is CRUD with some date math (expiration calculation). That logic lives in
shared TypeScript utilities, not on a server. RLS handles authorization at the
database level — more secure than middleware because it's impossible to bypass.

---

## 2. PostgREST (REST) vs. GraphQL

### How we query data now (PostgREST via Supabase SDK)

```typescript
// Get all grocery items for a household
const { data } = await supabase
  .from('grocery_items')
  .select('*, categories(name, emoji, has_expiration)')
  .eq('household_id', householdId)
  .is('completed_at', null)
  .order('created_at', { ascending: false })
```

This generates a single SQL query. We pick exactly which columns we want with
`.select()`. Supabase handles joins via foreign key relationships (the
`categories(...)` part).

### What GraphQL would look like

```graphql
query GetGroceryItems($householdId: UUID!) {
  grocery_items(
    where: { household_id: { _eq: $householdId }, completed_at: { _is_null: true } }
    order_by: { created_at: desc }
  ) {
    id
    name
    quantity
    categories {
      name
      emoji
      has_expiration
    }
  }
}
```

### Why we don't need GraphQL

| GraphQL advantage | Does it apply to us? |
|-------------------|---------------------|
| **Avoid over-fetching** (get only fields you need) | No — `.select('col1, col2')` already does this |
| **Avoid under-fetching** (get related data in one request) | No — `categories(name, emoji)` joins in one query |
| **Multiple clients with different needs** | No — we have one frontend |
| **Strong typed schema** | We already have TypeScript types from `supabase gen types` |
| **Introspection / documentation** | Supabase Studio already shows the schema |

| GraphQL cost | Impact |
|--------------|--------|
| **Schema definition file** | Extra file to maintain |
| **Code generation** | Need `graphql-codegen` build step |
| **Learning curve** | GraphQL syntax, resolvers, fragments |
| **Caching complexity** | Apollo/urql cache normalization is harder than TanStack Query |
| **N+1 query problems** | Need DataLoader or similar on the server side |

**Bottom line:** GraphQL solves the problem of "many different clients need
different shapes of the same data." We have one client. PostgREST gives us
the same targeted queries with zero setup.

#### When you WOULD pick GraphQL:

- **Multiple frontends** — web, iOS, Android, third-party API consumers
- **Complex nested queries** — "get user → their households → each household's items → each item's category → the category's default shelf days" in a single request
- **API gateway** — aggregating multiple microservices behind one schema
- **Public API** — letting third parties query your data flexibly

---

## 3. TanStack Query vs. Other State Management

### What TanStack Query does

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['grocery-items', householdId],
  queryFn: () => fetchGroceryItems(householdId),
})
```

Behind the scenes, it handles:
- **Caching** — same queryKey = same cached data, no duplicate requests
- **Background refetching** — stale data is shown immediately, fresh data loads behind the scenes
- **Optimistic updates** — UI updates before the server confirms
- **Error/retry** — automatic retry with exponential backoff
- **Cache invalidation** — `queryClient.invalidateQueries(['grocery-items'])` refreshes related data
- **Window focus refetching** — data refreshes when you switch back to the tab

### Why not Redux / Zustand / Context?

| Tool | What it is | Why not for us |
|------|-----------|----------------|
| **Redux** | Global state container | Massive boilerplate for async data. You'd write actions, reducers, thunks, selectors — all to do what `useQuery` does in 3 lines |
| **Zustand** | Lightweight global state | Great for client-only state (UI toggles, modals). Bad for server data — no caching, refetching, or invalidation built in |
| **React Context** | Built-in React state sharing | Re-renders every consumer on any change. No caching. Fine for auth/theme, terrible for data fetching |
| **SWR** | Vercel's data fetching library | Very similar to TanStack Query. TQ has more features: mutations, optimistic updates, infinite queries, devtools |
| **Apollo Client** | GraphQL client with cache | Requires GraphQL. Cache normalization is complex. Overkill for REST/PostgREST |

### Where TanStack Query fits in our architecture

```
┌──────────────────────────────────────────┐
│  React Components (UI)                   │
│    └── useGroceryItems()                 │  ← custom hook
│          └── useQuery()                  │  ← TanStack Query
│                └── supabase.from()...    │  ← Supabase SDK
│                      └── HTTP → PostgREST│  ← network
└──────────────────────────────────────────┘
```

TanStack Query is the **caching and sync layer** between our UI and Supabase.
It's not a state manager — it's a server-state cache. For pure client state
(which modal is open, dark mode toggle), we use regular React state.

---

## 4. Next.js vs. Other React Frameworks

### Why Next.js

| Feature | Benefit |
|---------|---------|
| **File-based routing** | `app/grocery/page.tsx` = `/grocery` route — no router config |
| **Server components** | Initial page load is fast (HTML rendered on server) |
| **API routes** | If we ever need a server endpoint, it's one file |
| **Image optimization** | Built-in `<Image>` component |
| **PWA support** | Easy to add service worker via `next-pwa` |
| **Vercel deployment** | `git push` = deployed |

### Why not Vite + React Router?

Vite is faster for pure SPAs (single-page apps), but:
- No server-side rendering (bad for SEO, slower initial load)
- No file-based routing (manual router config)
- No built-in API routes (need a separate backend)
- Less ecosystem for PWA + deployment

For a household app that benefits from fast initial loads and may eventually
need server-side features, Next.js is the safer choice.

---

## 5. shadcn/ui vs. Other Component Libraries

### What shadcn/ui is

It's **not a dependency** — it's a collection of copy-paste components built on
Radix UI primitives. When you run `npx shadcn@latest add button`, it copies the
component source code into your project. You own the code.

### Why not Material UI / Chakra / Ant Design?

| Library | Trade-off |
|---------|-----------|
| **Material UI** | Heavy bundle, opinionated Google design, hard to customize deeply |
| **Chakra UI** | Great DX, but larger bundle, its own styling system |
| **Ant Design** | Enterprise-focused, very opinionated, large bundle |
| **Headless UI** | Unstyled primitives (like Radix), but fewer components |

shadcn/ui gives us:
- **Full control** — the code is in our repo, we can modify anything
- **Radix primitives** — accessible by default (keyboard nav, screen readers, focus management)
- **Tailwind styling** — consistent with our design system
- **Tree-shakeable** — only the components we use are in the bundle
- **No version lock-in** — no dependency to update, no breaking changes from upstream

---

## 6. Row Level Security vs. Middleware Authorization

### Traditional approach (Express/FastAPI)

```python
# Every endpoint needs auth + authorization checks
@app.get("/api/items")
async def get_items(user = Depends(get_current_user)):
    # Check user belongs to household
    membership = db.query(HouseholdMember).filter_by(user_id=user.id).first()
    if not membership:
        raise HTTPException(403)
    # Fetch items
    return db.query(Item).filter_by(household_id=membership.household_id).all()
```

If you forget the check on even ONE endpoint, you have a security hole.

### Our approach (RLS)

```sql
CREATE POLICY "Users can view their household items"
  ON inventory_items FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )
  );
```

This applies to **every query** — PostgREST, direct SQL, Edge Functions,
Supabase Studio. It's impossible to bypass because it's enforced at the
database level. If someone discovers a new endpoint or finds a way to
call the API differently, RLS still blocks unauthorized access.

## 7. Offline Strategy: TanStack Query + AsyncStorage vs. WatermelonDB

### Original plan

The architecture doc specifies **WatermelonDB** for offline-first mobile data:
local SQLite storage on-device, background sync to Supabase.

### Why we dropped it

WatermelonDB would have required **maintaining two database schemas in parallel**:

| Concern | Supabase (Postgres) | WatermelonDB (SQLite) |
|---------|--------------------|-----------------------|
| Schema definition | SQL migrations | WatermelonDB model classes |
| Types | `supabase gen types` | Manual TypeScript types |
| RLS / auth | Postgres policies | N/A (local only) |
| Sync logic | — | Custom pull/push adapter |
| Conflict resolution | — | Custom merge functions |

For a **2-person household app**, this is a disproportionate amount of complexity:
1. Every schema change requires updating two places
2. The sync adapter between WatermelonDB ↔ Supabase is custom code with subtle bugs
3. Conflict resolution (last-write-wins) needs careful handling of `updated_at` timestamps
4. Testing doubles — need to test both local and remote data flows

### What we use instead

```
TanStack Query (cache layer)
  └── Supabase SDK (network)
  └── AsyncStorage mutation queue (offline writes)
  └── AsyncStorage auth cache (offline startup)
```

- **Reads**: TanStack Query caches responses in memory. The app shows cached data
  instantly and refetches in the background when online.
- **Writes**: When offline, mutations are queued in AsyncStorage via `mutation-queue.ts`.
  When connectivity returns, the queue drains automatically.
- **Auth**: Profile + household data cached in AsyncStorage so the app renders
  immediately without waiting for the network (see 5.1 — Offline Auth Resilience).

### Trade-offs accepted

| WatermelonDB advantage we lose | Acceptable because |
|-------------------------------|-------------------|
| True offline-first local DB | TQ cache + mutation queue covers 95% of offline use (checking items at the store) |
| Survives app kill while offline | Mutation queue persists to AsyncStorage — survives app restart |
| Large dataset performance | We have ~50-200 items per household, not thousands |

### When we'd reconsider

If Fridge Manager grows to support hundreds of households or needs complex offline
queries (filtering, sorting, joins while fully offline), we'd evaluate
**PowerSync** or **ElectricSQL** — both provide Postgres-native sync without
requiring a separate schema definition.

---

## Summary: When Would We Change?

| If this happens... | We'd consider... |
|--------------------|-----------------|
| Complex server logic (payments, ML, email queues) | Edge Functions or a lightweight FastAPI service |
| Multiple clients (iOS app, public API) | GraphQL gateway in front of Supabase |
| Need for complex aggregations/reports | Supabase database functions (PL/pgSQL) |
| Outgrow Supabase pricing | Self-hosted Supabase or migrate to raw Postgres + custom backend |
| Need offline-first with sync | Supabase + PowerSync or ElectricSQL |

For now, the stack is right-sized: **maximum capability, minimum complexity.**
