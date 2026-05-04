# Testing Push Notifications

How to manually verify that push notifications work end-to-end.

---

## Prerequisites

1. **Physical Android device** — push notifications don't work in emulators or Expo Go (SDK 54+)
2. **Development build** — run `npx expo run:android` or create an EAS build
3. **Logged in** to the app with a valid account
4. **Device registered** — the app auto-registers your FCM token on launch via `usePushNotifications`

---

## Quick Test: Send Yourself a Notification

The fastest way to verify everything works.

### From the app (in-code)

Add this temporarily to any screen or call it from the console:

```ts
import { supabase } from '../lib/supabase';

// Send a test push to yourself
const { data, error } = await supabase.functions.invoke('send-test-notification', {
  body: {
    title: '🧪 Test Notification',
    body: 'If you see this, push notifications are working!',
  },
});

console.log('Result:', data, error);
```

### From the terminal (curl)

You need two things:
- Your **Supabase access token** (the JWT you get after logging in)
- The **Supabase URL**

#### Step 1: Get your access token

Log in and grab the token:

```bash
# Log in to get an access token
curl -X POST 'https://vsjyngzffwdhqgjuoady.supabase.co/auth/v1/token?grant_type=password' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'
```

Copy the `access_token` from the response.

#### Step 2: Send a test notification

```bash
curl -X POST 'https://vsjyngzffwdhqgjuoady.supabase.co/functions/v1/send-test-notification' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "🧪 Test from terminal",
    "body": "Manual push test at '"$(date)"'"
  }'
```

**Expected response:**

```json
{
  "success": true,
  "devices_found": 1,
  "sent": 1,
  "failed": 0
}
```

If `devices_found` is 0, your FCM token hasn't been registered yet — open the app on your physical device first.

---

## Testing Each Notification Type

The daily cron job checks thresholds automatically, but you can test each type by creating inventory items with specific expiration dates and then invoking the check manually.

### Step 1: Create test inventory items

Use the Supabase SQL Editor (Dashboard → SQL Editor) to insert items that trigger each threshold. Replace `YOUR_HOUSEHOLD_ID` with your actual household UUID.

```sql
-- Find your household ID
SELECT id, name FROM households;

-- Insert test items that will trigger each notification type TODAY
INSERT INTO inventory_items (name, household_id, category_id, location, added_by, added_at, expiration_date)
VALUES
  -- 1. EXPIRED: expiration was 3 days ago
  ('🔴 Test Expired Milk', 'YOUR_HOUSEHOLD_ID',
   (SELECT id FROM categories WHERE name = 'dairy'), 'fridge',
   auth.uid(), now() - interval '10 days', now() - interval '3 days'),

  -- 2. DAY_OF: expires today
  ('🟠 Test Yogurt Today', 'YOUR_HOUSEHOLD_ID',
   (SELECT id FROM categories WHERE name = 'dairy'), 'fridge',
   auth.uid(), now() - interval '7 days', now()),

  -- 3. ONE_DAY: expires tomorrow
  ('🟡 Test Chicken Tomorrow', 'YOUR_HOUSEHOLD_ID',
   (SELECT id FROM categories WHERE name = 'meat'), 'fridge',
   auth.uid(), now() - interval '3 days', now() + interval '1 day'),

  -- 4. TWO_DAY: expires in 2 days
  ('🟢 Test Berries 2-Day', 'YOUR_HOUSEHOLD_ID',
   (SELECT id FROM categories WHERE name = 'produce'), 'fridge',
   auth.uid(), now() - interval '3 days', now() + interval '2 days'),

  -- 5. HALFWAY: today is the midpoint (added 10 days ago, expires in 10 days)
  ('⏳ Test Halfway Cheese', 'YOUR_HOUSEHOLD_ID',
   (SELECT id FROM categories WHERE name = 'dairy'), 'fridge',
   auth.uid(), now() - interval '10 days', now() + interval '10 days');
```

> **Note:** `auth.uid()` only works if you run this while authenticated. If using the SQL Editor with service role, replace `auth.uid()` with your actual user UUID:
>
> ```sql
> SELECT id FROM auth.users WHERE email = 'your-email@example.com';
> ```

### Step 2: Trigger the notification check

Invoke the cron Edge Function manually:

```bash
curl -X POST 'https://vsjyngzffwdhqgjuoady.supabase.co/functions/v1/check-expiration-notifications' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

**Expected response:**

```json
{
  "items_checked": 5,
  "notifications_sent": 5,
  "errors": 0
}
```

You should receive 5 push notifications on your device:

| # | Item | Notification |
|---|---|---|
| 1 | 🔴 Test Expired Milk | 🗑️ **Expired** — "Test Expired Milk expired 3 days ago — toss it?" |
| 2 | 🟠 Test Yogurt Today | 🚨 **Expires today!** — "Test Yogurt Today expires today — use it or lose it" |
| 3 | 🟡 Test Chicken Tomorrow | 🔔 **Expires tomorrow** — "Test Chicken Tomorrow expires tomorrow — use it today" |
| 4 | 🟢 Test Berries 2-Day | ⚠️ **Expiring soon** — "Test Berries 2-Day expires in 2 days" |
| 5 | ⏳ Test Halfway Cheese | ⏳ **Halfway there** — "Test Halfway Cheese is halfway to expiring — plan to use it soon" |

### Step 3: Clean up test data

```sql
DELETE FROM notification_log
WHERE inventory_item_id IN (
  SELECT id FROM inventory_items WHERE name LIKE '%Test%'
);

DELETE FROM inventory_items WHERE name LIKE '%Test%';
```

---

## Testing Quiet Hours

1. Set your quiet hours to include the current time:

```sql
UPDATE notification_preferences
SET quiet_hours_start = '00:00', quiet_hours_end = '23:59'
WHERE user_id = 'YOUR_USER_ID';
```

2. Re-run the cron check — you should get `notifications_sent: 0`
3. Reset quiet hours after testing:

```sql
UPDATE notification_preferences
SET quiet_hours_start = NULL, quiet_hours_end = NULL
WHERE user_id = 'YOUR_USER_ID';
```

---

## Testing Deduplication

1. Run the cron check twice in a row with the same test items
2. The second run should send 0 notifications for non-expired items
3. The `expired` type will only re-send if run on a different calendar day

Check the log:

```sql
SELECT nl.type, nl.sent_at, ii.name
FROM notification_log nl
JOIN inventory_items ii ON nl.inventory_item_id = ii.id
ORDER BY nl.sent_at DESC
LIMIT 20;
```

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| `devices_found: 0` | FCM token not registered | Open the app on a physical device (not emulator/Expo Go) |
| `sent: 0, failed: 1` | Invalid/expired FCM token | Re-open the app to refresh the token |
| `Firebase not configured` | Missing secret | Add `FIREBASE_SERVICE_ACCOUNT_KEY` in Supabase Dashboard → Edge Function Secrets |
| `notifications_sent: 0` | All notifications already sent (dedup) | Delete from `notification_log` for the test items |
| `notifications_sent: 0` | User is in quiet hours | Check `notification_preferences` for quiet hour settings |
| No notification on device | App notification permission denied | Check Android Settings → Apps → Fridge Manager → Notifications |
| `401 Unauthorized` | Bad or expired access token | Re-authenticate to get a fresh token |

---

## Checking System Logs

Every cron run and test notification is logged:

```sql
SELECT event, details, created_at
FROM system_logs
ORDER BY created_at DESC
LIMIT 10;
```
