import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Server-side guard for librarian-only API routes.
 * Verifies the caller is signed in and holds the librarian role.
 * Returns either the caller's id or a ready-made error response.
 */
export async function requireLibrarian(): Promise<
  { userId: string; error: null } | { userId: null; error: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      userId: null,
      error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    };
  }

  const { data: profile } = await (supabase.from('users') as any)
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'librarian') {
    return {
      userId: null,
      error: NextResponse.json(
        { error: 'Not authorised — librarian role required' },
        { status: 403 }
      ),
    };
  }

  return { userId: user.id, error: null };
}
