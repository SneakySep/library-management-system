import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireLibrarian } from '@/lib/api-auth';

/**
 * Sends a password-reset email to a member. The librarian never sees or sets
 * a password — Supabase emails a secure recovery link.
 *
 * Note: the built-in SMTP is aggressively rate-limited (a few emails/hour);
 * repeated requests will return "email rate limit exceeded" until a custom
 * SMTP provider is configured in the Supabase dashboard.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await requireLibrarian();
    if (error) return error;

    const supabase = await createClient();

    const { data: target } = await (supabase.from('users') as any)
      .select('email')
      .eq('id', id)
      .single();

    if (!target?.email) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const origin = req.headers.get('origin') ?? new URL(req.url).origin;

    const { error: sendError } = await supabase.auth.resetPasswordForEmail(target.email, {
      redirectTo: `${origin}/auth/callback`,
    });

    if (sendError) {
      return NextResponse.json({ error: sendError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
