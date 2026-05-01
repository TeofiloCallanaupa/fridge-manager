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
    
    // We create the client using the user's Auth header so we execute on their behalf
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    });

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

    // Insert the invite into the database
    // The RLS policy "household_invites_insert" will enforce that the user owns the household
    const { data: invite, error: insertError } = await supabaseClient
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
      console.log(`[DEV MODE] Skipping Resend. Invite URL for ${email}: ${inviteUrl}`);
    }

    return new Response(JSON.stringify({ success: true, invite_id: invite.id }), {
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
