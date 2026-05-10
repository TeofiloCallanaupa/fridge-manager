/// <reference types="https://deno.land/x/deploy@0.12.0/types.d.ts" />
// @ts-nocheck — Supabase Edge Functions run on Deno; these jsr: imports resolve at deploy time
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const allowedOrigin = Deno.env.get('CORS_ORIGIN') || '*';

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    // User-scoped client (respects RLS — only owners can insert invites)
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    });

    // Admin client for checking existing invites (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { household_id } = await req.json();

    if (!household_id) {
      return new Response(JSON.stringify({ error: 'Missing household_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // -----------------------------------------------------------------------
    // Create a single-use invite link (no email required, consent-based)
    // -----------------------------------------------------------------------
    // Anyone with this link can accept it, but only once. After acceptance the
    // invite status changes to 'accepted' and the link becomes invalid.
    // -----------------------------------------------------------------------

    const { data: invite, error: insertError } = await supabaseClient
      .from('household_invites')
      .insert({
        household_id,
        invited_by: user.id,
        invited_email: null, // Generic link — no email restriction
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating invite:', insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate the shareable invite link
    const siteUrl = Deno.env.get('NEXT_PUBLIC_SITE_URL') || 'http://localhost:3000';
    const inviteUrl = `${siteUrl}/invite/${invite.id}`;

    return new Response(JSON.stringify({
      success: true,
      invite_id: invite.id,
      invite_url: inviteUrl,
      action: 'invited',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Edge Function Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
