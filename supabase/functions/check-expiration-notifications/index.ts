import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NotificationType = 'halfway' | 'two_day' | 'one_day' | 'day_of' | 'expired';

interface NotifiableItem {
  id: string;
  name: string;
  added_at: string;
  expiration_date: string | null;
  discarded_at: string | null;
  household_id: string;
}

interface NotificationMessage {
  title: string;
  body: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Notification Logic (mirrors packages/shared/src/utils/notifications.ts)
// ---------------------------------------------------------------------------

function toMidnightUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function getActiveThresholds(item: NotifiableItem, today: Date): NotificationType[] {
  if (item.expiration_date === null) return [];
  if (item.discarded_at !== null) return [];

  const thresholds: NotificationType[] = [];
  const expirationDate = new Date(item.expiration_date);
  const addedDate = new Date(item.added_at);

  const todayMidnight = toMidnightUTC(today);
  const expirationMidnight = toMidnightUTC(expirationDate);
  const addedMidnight = toMidnightUTC(addedDate);

  const daysUntilExpiration = Math.round(
    (expirationMidnight.getTime() - todayMidnight.getTime()) / MS_PER_DAY
  );

  if (daysUntilExpiration < 0) {
    thresholds.push('expired');
    return thresholds;
  }
  if (daysUntilExpiration === 0) thresholds.push('day_of');
  if (daysUntilExpiration === 1) thresholds.push('one_day');
  if (daysUntilExpiration === 2) thresholds.push('two_day');

  const totalDays = Math.round(
    (expirationMidnight.getTime() - addedMidnight.getTime()) / MS_PER_DAY
  );
  if (totalDays > 0) {
    const halfwayDay = Math.round(totalDays / 2);
    const daysSinceAdded = Math.round(
      (todayMidnight.getTime() - addedMidnight.getTime()) / MS_PER_DAY
    );
    if (daysSinceAdded === halfwayDay) {
      thresholds.push('halfway');
    }
  }

  return thresholds;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function isInQuietHours(
  quietStart: string | null,
  quietEnd: string | null,
  now: Date,
  timezone: string
): boolean {
  if (!quietStart || !quietEnd) return false;

  const localTime = now.toLocaleTimeString('en-US', {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });

  const currentMinutes = timeToMinutes(localTime);
  const startMinutes = timeToMinutes(quietStart);
  const endMinutes = timeToMinutes(quietEnd);

  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

function buildNotificationMessage(
  itemName: string,
  type: NotificationType,
  daysExpired?: number
): NotificationMessage {
  switch (type) {
    case 'halfway':
      return { title: '⏳ Halfway there', body: `${itemName} is halfway to expiring — plan to use it soon` };
    case 'two_day':
      return { title: '⚠️ Expiring soon', body: `${itemName} expires in 2 days` };
    case 'one_day':
      return { title: '🔔 Expires tomorrow', body: `${itemName} expires tomorrow — use it today` };
    case 'day_of':
      return { title: '🚨 Expires today!', body: `${itemName} expires today — use it or lose it` };
    case 'expired': {
      const daysText = daysExpired ? `${daysExpired} days ago` : 'recently';
      return { title: '🗑️ Expired', body: `${itemName} expired ${daysText} — toss it?` };
    }
  }
}

// ---------------------------------------------------------------------------
// FCM Sender
// ---------------------------------------------------------------------------

async function getAccessToken(serviceAccount: { client_email: string; private_key: string; token_uri: string }): Promise<string> {
  // Build JWT for Google OAuth2
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const claim = btoa(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: serviceAccount.token_uri,
    iat: now,
    exp: now + 3600,
  }));

  const signInput = `${header}.${claim}`;

  // Import the private key for signing
  const pemContent = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');
  const binaryKey = Uint8Array.from(atob(pemContent), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signInput)
  );

  const jwt = `${signInput}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;

  // Exchange JWT for access token
  const tokenRes = await fetch(serviceAccount.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

async function sendFCMPush(
  token: string,
  message: NotificationMessage,
  projectId: string,
  accessToken: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token,
            notification: {
              title: message.title,
              body: message.body,
            },
            android: {
              priority: 'high',
            },
          },
        }),
      }
    );
    return res.ok;
  } catch (err) {
    console.error('FCM send failed:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Main Handler
// ---------------------------------------------------------------------------

Deno.serve(async (_req: Request) => {
  const startTime = Date.now();
  const today = new Date();

  try {
    // Initialize Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse Firebase service account
    const firebaseKeyRaw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY');
    let firebaseServiceAccount: { client_email: string; private_key: string; token_uri: string; project_id: string } | null = null;
    let fcmAccessToken: string | null = null;

    if (firebaseKeyRaw) {
      try {
        firebaseServiceAccount = JSON.parse(firebaseKeyRaw);
        fcmAccessToken = await getAccessToken(firebaseServiceAccount!);
      } catch (err) {
        console.error('Failed to parse Firebase key or get access token:', err);
      }
    } else {
      console.warn('FIREBASE_SERVICE_ACCOUNT_KEY not set — FCM disabled');
    }

    // 1. Query all active inventory items with expiration dates
    const { data: items, error: itemsError } = await supabase
      .from('inventory_items')
      .select('id, name, added_at, expiration_date, discarded_at, household_id')
      .is('discarded_at', null)
      .not('expiration_date', 'is', null);

    if (itemsError) throw itemsError;
    if (!items || items.length === 0) {
      await logSystemEvent(supabase, 'cron_run', {
        items_checked: 0,
        notifications_sent: 0,
        duration_ms: Date.now() - startTime,
      });
      return new Response(JSON.stringify({ items_checked: 0, notifications_sent: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Check thresholds for each item
    let totalNotificationsSent = 0;
    const errors: string[] = [];

    for (const item of items) {
      const thresholds = getActiveThresholds(item as NotifiableItem, today);
      if (thresholds.length === 0) continue;

      // 3. Check notification_log for deduplication
      const { data: existingLogs } = await supabase
        .from('notification_log')
        .select('type')
        .eq('inventory_item_id', item.id);

      const alreadySent = new Set((existingLogs || []).map((l: { type: string }) => l.type));

      for (const threshold of thresholds) {
        // Skip if already sent (except 'expired' which sends daily)
        if (threshold !== 'expired' && alreadySent.has(threshold)) continue;

        // For 'expired', check if sent today already
        if (threshold === 'expired') {
          const { data: todayLogs } = await supabase
            .from('notification_log')
            .select('id')
            .eq('inventory_item_id', item.id)
            .eq('type', 'expired')
            .gte('sent_at', toMidnightUTC(today).toISOString());

          if (todayLogs && todayLogs.length > 0) continue;
        }

        // 4. Get household info (timezone)
        const { data: household } = await supabase
          .from('households')
          .select('id, timezone')
          .eq('id', item.household_id)
          .single();

        if (!household) continue;

        // 5. Get household members with notification preferences
        const { data: members } = await supabase
          .from('household_members')
          .select('user_id')
          .eq('household_id', household.id);

        if (!members || members.length === 0) continue;

        const thresholdEnabledField = threshold === 'expired'
          ? 'post_expiration_enabled'
          : `${threshold}_enabled`;

        for (const member of members) {
          // 6. Check notification preferences
          const { data: prefs } = await supabase
            .from('notification_preferences')
            .select('*')
            .eq('user_id', member.user_id)
            .eq('household_id', household.id)
            .single();

          // If no prefs exist, default to all enabled (no quiet hours)
          const isEnabled = prefs
            ? (prefs as Record<string, unknown>)[thresholdEnabledField] !== false
            : true;

          if (!isEnabled) continue;

          // Check quiet hours
          if (prefs && isInQuietHours(
            prefs.quiet_hours_start,
            prefs.quiet_hours_end,
            today,
            household.timezone
          )) continue;

          // 7. Get push subscriptions for this user
          const { data: subscriptions } = await supabase
            .from('push_subscriptions')
            .select('token, platform')
            .eq('user_id', member.user_id)
            .eq('household_id', household.id);

          if (!subscriptions || subscriptions.length === 0) continue;

          // 8. Build and send notification
          const daysExpired = threshold === 'expired'
            ? Math.round((toMidnightUTC(today).getTime() - toMidnightUTC(new Date(item.expiration_date!)).getTime()) / MS_PER_DAY)
            : undefined;

          const message = buildNotificationMessage(item.name, threshold, daysExpired);

          for (const sub of subscriptions) {
            if (sub.platform === 'android' && firebaseServiceAccount && fcmAccessToken) {
              const success = await sendFCMPush(
                sub.token,
                message,
                firebaseServiceAccount.project_id,
                fcmAccessToken
              );
              if (success) {
                totalNotificationsSent++;
              } else {
                errors.push(`FCM failed for user ${member.user_id}, item ${item.name}`);
              }
            }
          }
        }

        // 9. Log to notification_log
        await supabase.from('notification_log').insert({
          inventory_item_id: item.id,
          household_id: item.household_id,
          type: threshold,
        });
      }
    }

    // 10. Write system log
    await logSystemEvent(supabase, 'cron_run', {
      items_checked: items.length,
      notifications_sent: totalNotificationsSent,
      errors,
      duration_ms: Date.now() - startTime,
    });

    return new Response(
      JSON.stringify({
        items_checked: items.length,
        notifications_sent: totalNotificationsSent,
        errors: errors.length,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Notification check failed:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function logSystemEvent(
  supabase: ReturnType<typeof createClient>,
  event: string,
  details: Record<string, unknown>
) {
  await supabase.from('system_logs').insert({ event, details });
}
