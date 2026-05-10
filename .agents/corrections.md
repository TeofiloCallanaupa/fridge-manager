# Fridge Manager — Corrections & Lessons

> Things the user has had to correct me on. Check this BEFORE taking action.

---

## 1. Always Push OTA Updates After Mobile Code Changes

**What I forgot:** After modifying mobile app code, I committed and pushed to git but did NOT push an OTA update. The user had to ask me to do it.

**Rule:** After ANY code change to `apps/mobile/`, ALWAYS push an OTA update:
```bash
cd apps/mobile
npx -y eas-cli update --branch preview --message "description" --non-interactive
```

**Note:** There is currently NO production build — only push to `preview`. If a production build is created in the future, also push to `production`.

**Important:** OTA updates require TWO cold starts to take effect:
1. First open → downloads update in background
2. Second open → applies the downloaded update

---

## 2. EAS CLI Is Not Globally Installed

**What I forgot:** Tried `npx eas` which failed. The correct invocation is:
```bash
npx -y eas-cli <command>
```

**Rule:** Always use `npx -y eas-cli` (not `eas` or `npx eas`).

---

## 3. Edge Function Deploy Requires deno.json Import Map

**What I forgot:** The `send-invite` edge function was originally deployed with a `deno.json` import map. Deploying without it via MCP caused `InternalServerError` failures.

**Rule:** When deploying edge functions via MCP, always include any `deno.json` file from the function's directory in the `files` array, and set `import_map_path` to `deno.json`.

---

## 4. EAS Project ID Is a Public Identifier

**Context:** User asked if the project ID is safe in plaintext. Yes — it's a public identifier like a package name, not a secret. It's already in `app.json` and OTA update URLs.

---

## Quick Reference: Post-Change Deployment Checklist

After making changes to:

| Changed | Action Required |
|---------|----------------|
| `apps/mobile/**` | Push OTA to `preview` AND `production` branches |
| `apps/web/**` | Vercel auto-deploys from `main` (no action needed) |
| `supabase/functions/**` | Deploy via MCP `deploy_edge_function` (include `deno.json`) |
| `packages/shared/**` | Rebuild: `pnpm --filter shared build` |
| `supabase/migrations/**` | Apply via MCP `apply_migration` + local `npx supabase db reset` |
