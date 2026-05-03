# Test Credentials

> Credentials for the seeded test user in local Supabase.
> Created automatically by `supabase/seed.sql` on every `supabase db reset`.

## Dev Test User

| Field | Value |
|---|---|
| **Email** | `dev@fridgemanager.test` |
| **Password** | `TestPassword123!` |
| **User ID** | `00000000-0000-0000-0000-000000000001` |
| **Display Name** | Dev Tester |
| **Household** | Dev Household |
| **Household ID** | `00000000-0000-0000-0000-000000000010` |
| **Role** | owner |

## Usage

### Web — Local development
Log in at `http://localhost:3000/login` with the email and password above.

### Mobile — Expo Go

#### Prerequisites
1. Your Mac and phone must be on the **same Wi-Fi network**.
2. Local Supabase must be running (`npx supabase status`).

#### Setup
```bash
# 1. Find your Mac's LAN IP
ipconfig getifaddr en0    # e.g. 192.168.0.191

# 2. Set it in the mobile env (already gitignored)
cat apps/mobile/.env.local
# EXPO_PUBLIC_SUPABASE_URL=http://<YOUR_LAN_IP>:54321
# EXPO_PUBLIC_SUPABASE_ANON_KEY=<local anon key from `supabase status`>

# 3. Start the dev server
cd apps/mobile && npx expo start

# 4. Scan the QR code with Expo Go on your phone
```

#### Login
Use the same test credentials from the table above:
- **Email:** `dev@fridgemanager.test`
- **Password:** `TestPassword123!`

#### Troubleshooting
| Problem | Fix |
|---|---|
| Login fails / "network error" | Verify LAN IP matches (`ipconfig getifaddr en0`), check firewall allows port 54321 |
| Stale data / FK violations | The app caches query data in AsyncStorage. It auto-clears when the Supabase URL changes, but you can force it by clearing Expo Go app data or running `npx supabase db reset` |
| Icons show as ☒ boxes | Should be fixed — we use `@expo/vector-icons`. If it persists, restart Expo bundler with `--clear` |

### E2E tests (Playwright)
Import from the test helper or reference these constants:

```typescript
const TEST_USER = {
  email: 'dev@fridgemanager.test',
  password: 'TestPassword123!',
  userId: '00000000-0000-0000-0000-000000000001',
  householdId: '00000000-0000-0000-0000-000000000010',
}
```

### Resetting
If the user gets corrupted, run:
```bash
npx supabase db reset
```
This re-runs all migrations + `seed.sql` from scratch.

## Security Notes

- These credentials **only exist in local Supabase** (created by `supabase/seed.sql`).
- The anon key in `.env.local` is the **default local Supabase demo key** — not a real secret.
- `.env.local` is in `.gitignore` — it will never be committed.
- **Never use real emails** (e.g. gmail.com) in tests or seeds.
- All test emails use the `.test` TLD (reserved by RFC 2606).
- E2E tests that create temporary users should use `*@example.com` or `*@test.local`.
