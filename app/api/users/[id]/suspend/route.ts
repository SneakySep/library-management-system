import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireLibrarian } from '@/lib/api-auth';

// ~100 years — effectively indefinite until reactivated.
const INDEFINITE_BAN = '876000h';

/** Suspends a member: blocks sign-in and revokes their refresh tokens. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId, error } = await requireLibrarian();
    if (error) return error;

    if (userId === id) {
      return NextResponse.json(
        { error: 'You cannot suspend your own account' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: target } = await (admin.from('users') as any)
      .select('role')
      .eq('id', id)
      .single();

    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (target.role === 'librarian') {
      const { count } = await (admin.from('users') as any)
        .select('id', { count: 'exact', head: true })
        .eq('role', 'librarian');

      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          { error: 'You cannot suspend the last librarian' },
          { status: 400 }
        );
      }
    }

    const { error: banError } = await admin.auth.admin.updateUserById(id, {
      ban_duration: INDEFINITE_BAN,
    });

    if (banError) {
      return NextResponse.json({ error: banError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
