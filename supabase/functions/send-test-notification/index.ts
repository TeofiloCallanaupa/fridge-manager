/// <reference types="https://deno.land/x/deploy@0.12.0/types.d.ts" />
// @ts-nocheck — Supabase Edge Functions run on Deno; these jsr: imports resolve at deploy time
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * send-test-notification
 *
 * Sends a test push notification to the calling user's registered devices
 * via the Expo Push API.
 *
 * Requires authentication (verify_jwt: true).
 *
 * POST body (optional):
 *   { "title": "Custom title", "body": "Custom body" }
 */

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
    let title = '\ud83e\uddea Test Notification';
    let body = 'If you see this, push notifications are working! \ud83c\udf89';

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

    // 6. Build Expo push messages
    const messages = subscriptions
      .filter((sub) => sub.token.startsWith('ExponentPushToken'))
      .map((sub) => ({
        to: sub.token,
        sound: 'default' as const,
        title,
        body,
        data: { type: 'test' },
      }));

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No Expo push tokens found',
          detail: 'Registered tokens are not Expo Push Tokens.',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 7. Send via Expo Push API
    const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const expoResult = await expoRes.json();
    console.log('Expo push result:', JSON.stringify(expoResult));

    // Count successes and failures
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    if (expoResult.data) {
      for (const ticket of expoResult.data) {
        if (ticket.status === 'ok') {
          sent++;
        } else {
          failed++;
          if (ticket.details?.error) {
            errors.push(ticket.details.error);
          }
        }
      }
    }

    // 8. Log the test
    await supabaseAdmin.from('system_logs').insert({
      event: 'test_notification',
      details: {
        user_id: user.id,
        devices_total: subscriptions.length,
        expo_tokens: messages.length,
        sent,
        failed,
        errors,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        devices_found: subscriptions.length,
        sent,
        failed,
        errors,
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
