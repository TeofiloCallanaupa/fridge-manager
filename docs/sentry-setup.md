# Sentry Error Tracking Setup

> Phase 8.2 of the Fridge Manager prompt playbook.

---

## Web (Next.js) ✅ COMPLETE

Setup was done via the `@sentry/wizard` CLI. All files are committed and working.

### What was configured

- **Package**: `@sentry/nextjs` installed via `pnpm --filter web add @sentry/nextjs`
- **Wizard**: `cd apps/web && npx @sentry/wizard@latest -i nextjs`
- **Features enabled**: Tracing, Session Replay, Logs
- **Ad-blocker tunneling**: No (unnecessary for personal app)
- **Example page**: `/sentry-example-page` — verified errors appear in Sentry dashboard ✅

### Files created by the wizard

```
apps/web/
├── sentry.server.config.ts       # Server-side Sentry init
├── sentry.edge.config.ts         # Edge runtime Sentry init
├── instrumentation.ts            # Next.js instrumentation hook
├── instrumentation-client.ts     # Client-side instrumentation
├── app/global-error.tsx          # Error boundary for uncaught errors
├── app/sentry-example-page/      # Test page (can delete after verifying)
├── app/api/sentry-example-api/   # Test API route (can delete after verifying)
└── next.config.ts                # Modified — wrapped with withSentryConfig
```

### Environment variables

In `apps/web/.env.local`:

```env
NEXT_PUBLIC_SENTRY_DSN=<your-dsn>
SENTRY_ORG=self-nyp
SENTRY_PROJECT=fridge-manager-web
SENTRY_AUTH_TOKEN=<your-auth-token>
```

In `apps/web/.env.sentry-build-plugin` (auto-generated, gitignored):

```env
SENTRY_AUTH_TOKEN=<your-auth-token>
```

### For Vercel deployment (Phase 8.4)

Add these to Vercel → Settings → Environment Variables:
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG` = `self-nyp`
- `SENTRY_PROJECT` = `fridge-manager-web`

---

## Mobile (React Native / Expo) — TODO

The code integration is already committed (`app/_layout.tsx` + `app.json`). What remains is creating the Sentry project and adding the DSN.

### What's already done ✅

1. **Package installed**: `@sentry/react-native` added to `apps/mobile`
2. **Expo plugin configured** in `app.json`:
   ```json
   ["@sentry/react-native/expo", {
     "organization": "self-nyp",
     "project": "fridge-manager-mobile"
   }]
   ```
3. **Sentry.init()** added to `apps/mobile/app/_layout.tsx`:
   - DSN from `EXPO_PUBLIC_SENTRY_DSN` env var
   - Disabled in dev (`enabled: !__DEV__`)
   - 20% trace sampling in production
4. **Root component wrapped** with `Sentry.wrap(RootLayout)`

### What you still need to do

1. **Create the Sentry project**:
   - Go to [sentry.io](https://sentry.io) → Projects → Create Project
   - Platform: **React Native**
   - Project slug: `fridge-manager-mobile`
   - Team: `#self`

2. **Copy the DSN** from Settings → Projects → `fridge-manager-mobile` → Client Keys (DSN)

3. **Add the DSN** to `apps/mobile/.env.local`:
   ```env
   EXPO_PUBLIC_SENTRY_DSN=https://your-dsn@o123.ingest.sentry.io/789
   ```

4. **Test it** — temporarily set `enabled: true` in `_layout.tsx`, then throw an error:
   ```tsx
   // Add this button temporarily to any screen:
   <Button onPress={() => { throw new Error('Sentry mobile test'); }} title="Test Sentry" />
   ```
   Check the Sentry dashboard — the error should appear within ~30 seconds.

5. **Revert** `enabled` back to `!__DEV__` after testing.

> **Note:** Sentry won't capture errors in Expo Go. You need a dev build (`npx expo run:android` or `npx expo run:ios`) or an EAS build to see native crash reports.

---

## Source Maps

### Web
Source maps are uploaded automatically during `next build` when `SENTRY_AUTH_TOKEN` is set. Configured in `next.config.ts` by the wizard.

### Mobile
Source maps are uploaded during EAS builds when the Sentry plugin is configured in `app.json`. For local builds:

```bash
npx sentry-expo-upload-sourcemaps dist
```

---

## Cost & Quota Notes

| Tier | Errors | Transactions | Replays |
|---|---|---|---|
| **Free** | 5K/month | 10K/month | 50/month |

**Current config**:
- `tracesSampleRate: 0.2` in production (20% of transactions)
- Session replay only on error (`replaysOnErrorSampleRate: 1.0`)
- Mobile disabled in dev to avoid noise

---

## Cleanup

After verifying both platforms work, you can delete the test pages:

```bash
rm -rf apps/web/app/sentry-example-page
rm -rf apps/web/app/api/sentry-example-api
```
