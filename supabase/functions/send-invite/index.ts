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
    
    // We create the client using the user's Auth header so we execute on their behalf
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    });

    // Admin client for looking up users and bypassing RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, household_id } = await req.json();

    if (!email || !household_id) {
      return new Response(JSON.stringify({ error: 'Missing email or household_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // -----------------------------------------------------------------------
    // Check if the invited email belongs to an existing user
    // -----------------------------------------------------------------------
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      // Check if they're already a member of this household
      const { data: existingMember } = await supabaseAdmin
        .from('household_members')
        .select('id')
        .eq('user_id', existingUser.id)
        .eq('household_id', household_id)
        .single();

      if (existingMember) {
        return new Response(
          JSON.stringify({ error: 'This user is already a member of this household' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Directly add the existing user as a member
      const { error: insertError } = await supabaseAdmin
        .from('household_members')
        .insert({
          household_id,
          user_id: existingUser.id,
          role: 'member',
        });

      if (insertError) {
        console.error('Error adding existing user:', insertError);
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: 'added_directly',
          message: `${email} has been added to the household`,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // -----------------------------------------------------------------------
    // New user — check for existing pending invite or create one
    // -----------------------------------------------------------------------

    // Use admin client to check for existing pending invite (avoids RLS issues)
    const { data: existingInvite } = await supabaseAdmin
      .from('household_invites')
      .select('id, invited_email, expires_at')
      .eq('household_id', household_id)
      .eq('invited_email', email)
      .eq('status', 'pending')
      .single();

    let invite;

    if (existingInvite) {
      // Refresh the expiry on the existing invite (resend scenario)
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('household_invites')
        .update({ expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() })
        .eq('id', existingInvite.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error refreshing invite:', updateError);
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      invite = updated;
    } else {
      // Create a new invite
      const { data: newInvite, error: insertError } = await supabaseClient
        .from('household_invites')
        .insert({
          household_id,
          invited_by: user.id,
          invited_email: email,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting invite:', insertError);
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      invite = newInvite;
    }

    // Generate the deep link
    const siteUrl = Deno.env.get('NEXT_PUBLIC_SITE_URL') || 'http://localhost:3000';
    const inviteUrl = `${siteUrl}/invite/${invite.id}`;

    // Send email using Resend, or fallback to logging
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (resendApiKey) {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Fridge Manager <invites@fridgemanager.app>',
          to: email,
          subject: 'You have been invited to a Household!',
          html: `<p>You've been invited to join a household on Fridge Manager.</p><p><a href="${inviteUrl}">Click here to join</a></p>`,
        }),
      });

      if (!resendRes.ok) {
        const err = await resendRes.text();
        console.error('Failed to send email:', err);
        // We still return success since the invite was created in DB
      } else {
        console.log(`Successfully sent invite email to ${email}`);
      }
    } else {
      console.log(`[DEV MODE] No RESEND_API_KEY set. Invite URL for ${email}: ${inviteUrl}`);
    }

    return new Response(JSON.stringify({
      success: true,
      invite_id: invite.id,
      action: existingInvite ? 'resent' : 'invited',
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
