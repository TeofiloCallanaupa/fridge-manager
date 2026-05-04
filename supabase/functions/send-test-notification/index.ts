import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * send-test-notification
 *
 * Sends a test push notification to the calling user's registered devices.
 * Requires authentication (verify_jwt: true).
 *
 * POST body (optional):
 *   { "title": "Custom title", "body": "Custom body" }
 *
 * If no body provided, sends a default test message.
 */

// ---------------------------------------------------------------------------
// FCM Sender (shared with check-expiration-notifications)
// ---------------------------------------------------------------------------

async function getAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
  token_uri: string;
}): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const claim = btoa(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: serviceAccount.token_uri,
      iat: now,
      exp: now + 3600,
    })
  );

  const signInput = `${header}.${claim}`;

  const pemContent = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\\n/g, '');
  const binaryKey = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));

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

  const jwt = `${signInput}.${btoa(
    String.fromCharCode(...new Uint8Array(signature))
  )}`;

  const tokenRes = await fetch(serviceAccount.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

// ---------------------------------------------------------------------------
// Main Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  try {
    // 1. Get the calling user's JWT from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Init Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // User-scoped client (to get the user from the JWT)
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service client (for reading push_subscriptions)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Get calling user
    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Parse optional custom message from request body
    let title = '🧪 Test Notification';
    let body = `Hey! This is a test push from Fridge Manager. If you see this, notifications are working! 🎉`;

    try {
      const reqBody = await req.json();
      if (reqBody.title) title = reqBody.title;
      if (reqBody.body) body = reqBody.body;
    } catch {
      // No body or invalid JSON — use defaults
    }

    // 5. Get all push tokens for this user
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('token, platform, household_id')
      .eq('user_id', user.id);

    if (subError) {
      console.error('Failed to fetch subscriptions:', subError);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No push tokens found',
          detail:
            'No devices registered for push notifications. Open the app on a physical device first.',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 6. Get Firebase credentials
    const firebaseKeyRaw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY');
    if (!firebaseKeyRaw) {
      return new Response(
        JSON.stringify({ error: 'Firebase not configured' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const firebaseServiceAccount = JSON.parse(firebaseKeyRaw);
    const accessToken = await getAccessToken(firebaseServiceAccount);

    // 7. Send to all registered devices
    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      if (sub.platform !== 'android') continue; // Only FCM for now

      try {
        const res = await fetch(
          `https://fcm.googleapis.com/v1/projects/${firebaseServiceAccount.project_id}/messages:send`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: {
                token: sub.token,
                notification: { title, body },
                android: { priority: 'high' },
              },
            }),
          }
        );

        if (res.ok) {
          sent++;
        } else {
          const errBody = await res.text();
          console.error(`FCM failed for token ${sub.token.slice(0, 10)}...:`, errBody);
          failed++;
        }
      } catch (err) {
        console.error('FCM request error:', err);
        failed++;
      }
    }

    // 8. Log the test
    await supabaseAdmin.from('system_logs').insert({
      event: 'test_notification',
      details: {
        user_id: user.id,
        devices_total: subscriptions.length,
        sent,
        failed,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        devices_found: subscriptions.length,
        sent,
        failed,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Test notification failed:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
