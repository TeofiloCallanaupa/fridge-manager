# Fridge Manager

A shared household grocery and inventory management application designed to reduce food waste. 

## Local Development

This project uses a monorepo setup with `pnpm` and a local Supabase instance for backend services.

### Prerequisites
- Node.js (v22+)
- pnpm (v10+)
- Docker Desktop (must be running for local Supabase)

### Getting Started

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Start Local Supabase Environment:**
   Ensure Docker Desktop is open and running, then start the Supabase containers:
   ```bash
   npx supabase start
   ```

3. **Start the Development Servers:**
   ```bash
   pnpm dev:web
   ```
   The web app will be available at `http://localhost:3000`.

## Database Management & Troubleshooting

If you make manual changes to the database schema (`supabase/migrations`), or if you encounter infinite recursion loops during development testing, you can easily reset your local database to a clean state.

### How to Reset the Database
```bash
npx supabase db reset
```

### ⚠️ Common Error: `supabase start is not running`

**Error:**
```text
open /Users/.../.supabase/profile: no such file or directory
2026/04/28 19:12:11 HTTP POST: https://eu.i.posthog.com/batch/
supabase start is not running.
```

**Cause:** 
Your local Supabase Docker containers are stopped. The `db reset` command requires the Postgres container to be actively running so it can apply the migrations.

**Solution:**
Start the Supabase environment first, and then run the reset command:
```bash
npx supabase start
npx supabase db reset
```
*(Tip: You can chain them together with `npx supabase start && npx supabase db reset`)*
