import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import Link from 'next/link';

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Fetch the invite details using admin client since RLS prevents non-members from reading
  const { data: invite, error: inviteError } = await supabaseAdmin
    .from('household_invites')
    .select('*, households(name)')
    .eq('id', token)
    .single();

  if (inviteError || !invite) {
    return (
      <div className="flex h-screen w-full items-center justify-center p-4 bg-[var(--color-surface)]">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-[var(--color-on-surface)]">Invalid Invite</h1>
          <p className="text-[var(--color-on-surface-variant)]">
            This invite link is invalid or has expired. Please ask for a new invite.
          </p>
          <Link href="/" className="inline-block mt-4 w-full cursor-pointer bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] font-bold py-4 px-8 rounded-full active:scale-95 transition-all text-lg hover:bg-[var(--color-surface-container-highest)]">
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  // Check if it's already accepted or expired
  if (invite.status !== 'pending') {
    return (
      <div className="flex h-screen w-full items-center justify-center p-4 bg-[var(--color-surface)]">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-[var(--color-on-surface)]">Invite Unavailable</h1>
          <p className="text-[var(--color-on-surface-variant)]">
            This invite has already been accepted or is no longer valid.
          </p>
          <Link href="/" className="inline-block mt-4 w-full cursor-pointer bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] font-bold py-4 px-8 rounded-full active:scale-95 transition-all text-lg hover:bg-[var(--color-surface-container-highest)]">
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  // 2. If the user is not logged in, redirect them to sign up with a ?next param
  if (!user) {
    const nextPath = encodeURIComponent(`/invite/${token}`);
    redirect(`/signup?next=${nextPath}&email=${encodeURIComponent(invite.invited_email)}`);
  }

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center p-4 bg-[var(--color-surface)]">
      <div className="max-w-md w-full space-y-8 bg-[var(--color-surface-container-lowest)] p-8 rounded-[1.5rem] soft-shadow text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-on-surface)]">Join Household</h1>
          <p className="text-[var(--color-on-surface-variant)]">
            You've been invited to join <strong>{invite.households?.name || 'a household'}</strong>.
          </p>
        </div>

        <form action={acceptInvite} className="mt-6">
          <input type="hidden" name="token" value={token} />
          <button type="submit" className="forest-gradient cursor-pointer text-[var(--color-on-primary)] font-bold py-4 px-8 rounded-full w-full active:scale-95 transition-transform text-lg shadow-lg shadow-[var(--color-primary)]/10">
            Accept Invitation
          </button>
        </form>
      </div>
    </div>
  );
}

// Inline Server Action to accept the invite
async function acceptInvite(formData: FormData) {
  'use server';
  
  const token = formData.get('token') as string;
  
  if (!token) return redirect('/dashboard');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/invite/${token}`);
  }

  // Re-fetch invite from DB using token — NEVER trust client-provided household_id
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: invite, error: inviteError } = await supabaseAdmin
    .from('household_invites')
    .select('household_id, invited_email, status, expires_at')
    .eq('id', token)
    .single();

  if (inviteError || !invite) {
    redirect('/?error=Invalid or expired invite');
  }

  // Verify the invite is still valid
  if (invite.status !== 'pending') {
    redirect('/?error=This invite has already been used');
  }

  if (new Date(invite.expires_at) < new Date()) {
    redirect('/?error=This invite has expired');
  }

  // Verify the authenticated user's email matches the invited email
  if (user.email !== invite.invited_email) {
    redirect(`/invite/${token}?error=This invite was sent to a different email address`);
  }

  // 1. Insert into household_members
  const { error: insertError } = await supabaseAdmin
    .from('household_members')
    .insert({
      household_id: invite.household_id,
      user_id: user.id,
      role: 'member'
    });

  if (insertError && insertError.code !== '23505') { // Ignore unique violation if already member
    console.error('Error adding user to household:', insertError);
    redirect(`/?error=Failed to join household`);
  }

  // 2. Update invite status to accepted
  await supabaseAdmin
    .from('household_invites')
    .update({ status: 'accepted' })
    .eq('id', token);

  redirect('/dashboard');
}
