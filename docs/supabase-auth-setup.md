# Supabase Auth — Manual Setup Steps

These are one-time configuration steps in the Supabase Dashboard that can't be automated via code.

---

## 1. Update Email Templates (Required for Magic Links & Signup)

Supabase's default email templates use `{{ .ConfirmationURL }}` which redirects through Supabase's hosted page. For our SSR app, we need the **token hash** flow instead so the callback hits our own `/auth/callback` route.

### Steps

1. Go to the [Supabase Dashboard](https://supabase.com/dashboard)
2. Open your project: **fridge-manager** (`vsjyngzffwdhqgjuoady`)
3. Navigate to **Authentication** → **Email Templates**

### Confirm Signup Template

4. Select the **Confirm signup** template
5. Replace the email body's confirmation link with:

```html
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email">
  Confirm your email
</a>
```

6. Click **Save**

### Magic Link Template

7. Select the **Magic Link** template
8. Replace the email body's link with:

```html
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink">
  Log in to Fridge Manager
</a>
```

9. Click **Save**

### Invite User Template (Optional — for household invites later)

10. Select the **Invite user** template
11. Replace the email body's link with:

```html
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite">
  Accept invitation
</a>
```

12. Click **Save**

---

## 2. Set the Site URL (Required)

The **Site URL** is used by `{{ .SiteURL }}` in email templates. It determines where confirmation/magic-link emails point to. Supabase only allows **one value** at a time.

> **Dev → Prod workflow:** Set it to `localhost` while developing. When you deploy to Vercel, change this single value to your production URL. No template changes needed — `{{ .SiteURL }}` resolves dynamically.

### Steps

1. In the Supabase Dashboard, go to **Authentication** → **URL Configuration**
2. Set **Site URL** to: `http://localhost:3000`
3. Click **Save**

> ⚠️ **Before deploying to production**, come back here and change this to your Vercel URL (e.g. `https://fridge-manager.vercel.app`). That's the only change needed.

---

## 3. Add Redirect URLs (Required)

The **Redirect URLs** list is a whitelist of allowed redirect destinations. Unlike Site URL, this supports **multiple entries** with wildcards. Add both local and production URLs now so you don't have to come back later.

### Steps

1. Still in **Authentication** → **URL Configuration**
2. Under **Redirect URLs**, add both:
   - `http://localhost:3000/**`
   - `https://fridge-manager.vercel.app/**` (or your Vercel domain once known)
3. Click **Save**

---

## 4. Enable Email Auth Provider (Verify)

This should already be enabled by default, but verify:

### Steps

1. Go to **Authentication** → **Providers**
2. Ensure **Email** is enabled
3. Verify these settings:
   - **Confirm email**: ON (users must verify email)
   - **Secure email change**: ON
   - **Minimum password length**: 6

---

## Verification Checklist

After completing the steps above, verify by:

- [ ] Signing up at `http://localhost:3000/signup` with a real email
- [ ] Receiving the confirmation email with the correct link format
- [ ] Clicking the link and being redirected to `http://localhost:3000/`
- [ ] Logging in at `http://localhost:3000/login` with the confirmed credentials
- [ ] Sending a magic link and receiving the email
- [ ] Clicking the magic link and being logged in

---

> **Note**: These templates use `{{ .SiteURL }}` which automatically resolves to whatever you set in step 2. When you deploy to production, just update the Site URL — no template changes needed.
