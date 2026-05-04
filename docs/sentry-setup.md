# Sentry Error Tracking Setup

> Phase 8.2 of the Fridge Manager prompt playbook.

## Prerequisites

1. Create a [Sentry account](https://sentry.io/signup/) (free tier is fine)
2. Create a **Sentry organization** (or use your existing one)
3. Create **two projects** in the Sentry dashboard:
   - `fridge-manager-web` — Platform: **Next.js**
   - `fridge-manager-mobile` — Platform: **React Native**
4. Copy the **DSN** for each project (Settings → Projects → Client Keys)

---

## Web (Next.js)

### 1. Install

```bash
pnpm --filter web add @sentry/nextjs
```

### 2. Run the wizard

```bash
cd apps/web && npx @sentry/wizard@latest -i nextjs
```

This auto-creates:
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- Updates `next.config.ts` to wrap with `withSentryConfig`
- Creates `.env.sentry-build-plugin` (for source maps)

### 3. Environment variables

Add to `apps/web/.env.local` (and Vercel dashboard for production):

```env
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@o123.ingest.sentry.io/456
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=fridge-manager-web
SENTRY_AUTH_TOKEN=sntrys_your-auth-token
```

> [!IMPORTANT]
> `SENTRY_AUTH_TOKEN` is needed for source map uploads during builds. Generate one at Settings → Auth Tokens.

### 4. Configure `sentry.client.config.ts`

```ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  
  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  
  // Session replay (optional — captures user sessions on error)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  
  integrations: [
    Sentry.replayIntegration(),
  ],
});
```

### 5. Configure `sentry.server.config.ts`

```ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
});
```

### 6. Error boundary

The Sentry wizard adds a global error page. Verify `apps/web/app/global-error.tsx` exists:

```tsx
'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <h2>Something went wrong</h2>
        <button onClick={() => reset()}>Try again</button>
      </body>
    </html>
  );
}
```

### 7. Test it

```bash
# Add this temporarily to any page to verify Sentry captures it:
<button onClick={() => { throw new Error('Sentry test error'); }}>Test Sentry</button>
```

Check the Sentry dashboard — the error should appear within ~30 seconds.

---

## Mobile (React Native / Expo)

### 1. Install

```bash
pnpm --filter mobile add @sentry/react-native
npx expo install @sentry/react-native
```

### 2. Add the Expo config plugin

In `apps/mobile/app.json`, add the Sentry plugin:

```json
{
  "expo": {
    "plugins": [
      [
        "@sentry/react-native/expo",
        {
          "organization": "your-org-slug",
          "project": "fridge-manager-mobile"
        }
      ]
    ]
  }
}
```

### 3. Environment variables

Add to `apps/mobile/.env`:

```env
SENTRY_DSN=https://your-dsn@o123.ingest.sentry.io/789
SENTRY_AUTH_TOKEN=sntrys_your-auth-token
```

### 4. Initialize in the app root

In `apps/mobile/app/_layout.tsx`, add initialization before the component:

```ts
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  
  // Disable in development to avoid noise
  enabled: !__DEV__,
});
```

### 5. Wrap the root component

```tsx
// In _layout.tsx, wrap the default export:
export default Sentry.wrap(RootLayout);
```

### 6. Navigation tracking (optional)

If you want performance traces per screen:

```ts
import { useNavigationContainerRef } from 'expo-router';

const navigationRef = useNavigationContainerRef();

Sentry.init({
  // ... existing config
  integrations: [
    Sentry.reactNavigationIntegration({
      routingInstrumentation: navigationRef,
    }),
  ],
});
```

### 7. Test it

```bash
# In any screen, add a test button:
<Button onPress={() => { throw new Error('Sentry mobile test'); }} title="Test Sentry" />
```

> [!NOTE]
> Sentry is disabled in dev mode (`enabled: !__DEV__`). To test locally, temporarily set `enabled: true`.

---

## Source Maps

### Web
Source maps are uploaded automatically during `next build` when `SENTRY_AUTH_TOKEN` is set. The wizard configures this in `next.config.ts`.

### Mobile
Source maps are uploaded during EAS builds when the Sentry plugin is configured. For local builds:

```bash
npx sentry-expo-upload-sourcemaps dist
```

---

## Verifying the Setup

| Check | How |
|---|---|
| Web errors appear in Sentry | Throw a test error in a client component |
| Server errors appear | Throw in a server action or API route |
| Performance traces | Check Sentry → Performance → look for page load traces |
| Source maps work | Error stack traces show original TS file names, not minified |
| Mobile errors appear | Throw in a screen component (with `enabled: true`) |

---

## Cost Notes

- **Free tier**: 5K errors/month, 10K performance transactions/month
- **Recommended sample rates**: `tracesSampleRate: 0.2` in production (20% of transactions) to stay within limits
- **Session replay**: Only captures on error (`replaysOnErrorSampleRate: 1.0`) to minimize cost

---

## Files Modified

After setup, these files will be new or changed:

```
apps/web/
├── sentry.client.config.ts    [NEW]
├── sentry.server.config.ts    [NEW]  
├── sentry.edge.config.ts      [NEW]
├── app/global-error.tsx        [NEW or MODIFIED]
├── next.config.ts              [MODIFIED — wrapped with withSentryConfig]
└── .env.local                  [MODIFIED — add DSN + auth token]

apps/mobile/
├── app/_layout.tsx             [MODIFIED — Sentry.init + wrap]
├── app.json                    [MODIFIED — add plugin]
└── .env                        [MODIFIED — add DSN + auth token]
```
