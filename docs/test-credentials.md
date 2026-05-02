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

### Local development
Log in at `http://localhost:3000/login` with the email and password above.

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

## Rules

- **Never use real emails** (e.g. gmail.com) in tests or seeds.
- All test emails use the `.test` TLD (reserved by RFC 2606).
- E2E tests that create temporary users should use `*@example.com` or `*@test.local`.
