---
description: Security review against OWASP Top 10 2025. Use after implementing auth, RLS, or any feature that handles user data.
---

# Security Architect Review

## Before starting
1. Read `docs/architecture.md` — focus on schema, auth flow, and notification system
2. Fetch the latest OWASP Top 10 (2025) if unsure about any category

## OWASP Top 10 2025 Audit

### A01: Broken Access Control
- [ ] RLS policies exist on ALL tables with `household_id`
- [ ] Users can only read/write data for households they belong to
- [ ] `household_members` enforces UNIQUE(household_id, user_id)
- [ ] Invite tokens expire after 7 days (`expires_at` field)
- [ ] Only household owners can invite new members
- [ ] Edge Functions verify auth before processing

### A02: Cryptographic Failures
- [ ] No secrets in client-side code (SUPABASE_ANON_KEY is safe, but SERVICE_ROLE_KEY never exposed)
- [ ] FCM tokens stored server-side only
- [ ] No PII logged in `system_logs`
- [ ] Avatar config is non-sensitive (just hair/eye/skin choices)

### A03: Injection
- [ ] All database queries use Supabase client (parameterized by default)
- [ ] No raw SQL in client code
- [ ] User inputs (item names, quantities) are validated/sanitized
- [ ] FoodKeeper fuzzy match doesn't execute user input as code

### A04: Insecure Design
- [ ] Auth uses Supabase Auth (not custom implementation)
- [ ] Invite flow: email → Edge Function → Supabase Auth → redirect (no open redirect)
- [ ] Notification preferences are per-user, not per-household
- [ ] `discard_reason` is constrained to known values ('consumed' | 'expired' | 'wasted')
- [ ] Item `source` is constrained to known values ('manual' | 'grocery_checkout')

### A05: Security Misconfiguration
- [ ] Supabase project has RLS enabled on ALL tables (not just some)
- [ ] CORS is configured for production domains only
- [ ] Supabase anon key has minimal permissions
- [ ] `pg_cron` jobs run with appropriate privileges
- [ ] No unused Edge Functions deployed

### A06: Vulnerable and Outdated Components
- [ ] `pnpm audit` shows no high/critical vulnerabilities
- [ ] Expo SDK is on a supported version
- [ ] Next.js is on a supported version
- [ ] Supabase client libraries are current

### A07: Identification and Authentication Failures
- [ ] Auth supports email/password (Supabase default)
- [ ] Session tokens have reasonable expiry
- [ ] Refresh tokens are rotated
- [ ] Failed login attempts are not enumerable (no "email not found" vs "wrong password")

### A08: Software and Data Integrity Failures
- [ ] Grocery item `checked_by` must be a household member
- [ ] `inventory_items.added_by` must be a household member
- [ ] Data migrations don't drop existing user data
- [ ] Seed data (categories, default_shelf_days) uses ON CONFLICT DO NOTHING

### A09: Security Logging and Monitoring Failures
- [ ] `system_logs` table captures cron runs, errors, and anomalies
- [ ] Sentry captures frontend errors with context
- [ ] `notification_log` prevents duplicate notifications
- [ ] Failed auth attempts are observable

### A10: Server-Side Request Forgery (SSRF)
- [ ] Edge Functions don't make requests to user-supplied URLs
- [ ] Invite flow sends email to validated addresses only
- [ ] No user-controlled redirects after auth

## Output format
Produce a compliance table:

| OWASP Category | Status | Details |
|---|---|---|
| A01: Broken Access Control | ✅ / ⚠️ / ❌ | [specifics] |
| A02: Cryptographic Failures | ✅ / ⚠️ / ❌ | [specifics] |
| ... | ... | ... |

Then list any **critical findings** that must be fixed before deployment.
