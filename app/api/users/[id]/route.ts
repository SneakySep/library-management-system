import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireLibrarian } from '@/lib/api-auth';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = (await req.json()) as { role?: 'member' | 'librarian'; full_name?: string };

    // Check whether the caller is a librarian (RLS allows reading own profile).
    const { data: profile } = await (supabase.from('users') as any)
      .select('role')
      .eq('id', user.id)
      .single();

    const isLibrarian = profile?.role === 'librarian';

    // Only librarians can update other users or change roles.
    if (!isLibrarian && (user.id !== id || body.role)) {
      return NextResponse.json(
        { error: 'Not authorised to update this user' },
        { status: 403 }
      );
    }

    const updates: { role?: 'member' | 'librarian'; full_name?: string } = {};
    if (body.role) updates.role = body.role;
    if (typeof body.full_name === 'string') updates.full_name = body.full_name;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No supported fields to update' }, { status: 400 });
    }

    const { data, error } = await (supabase.from('users') as any)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * Permanently deletes a user account (profile + borrow history cascade).
 * Librarian-only, with guards against deleting yourself, the last librarian,
 * or a member who still has active loans.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId, error } = await requireLibrarian();
    if (error) return error;

    if (userId === id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
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
          { error: 'You cannot delete the last librarian' },
          { status: 400 }
        );
      }
    }

    const { count: activeLoans } = await (admin.from('borrow_records') as any)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', id)
      .eq('status', 'active');

    if ((activeLoans ?? 0) > 0) {
      return NextResponse.json(
        {
          error: `This member still has ${activeLoans} active loan${
            activeLoans === 1 ? '' : 's'
          } — process the return${activeLoans === 1 ? '' : 's'} first`,
        },
        { status: 400 }
      );
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
