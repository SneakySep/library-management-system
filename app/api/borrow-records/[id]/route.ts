import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * PATCH /api/borrow-records/[id]
 * Librarian-only: change the due date of an active loan (renewal).
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'You must be signed in' }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: profile } = await (admin.from('users') as any)
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'librarian') {
      return NextResponse.json({ error: 'Only librarians can modify loans' }, { status: 403 });
    }

    const body = (await req.json()) as { due_date?: string };
    if (!body.due_date) {
      return NextResponse.json({ error: 'due_date is required' }, { status: 400 });
    }

    const dueDate = new Date(body.due_date);
    if (Number.isNaN(dueDate.getTime())) {
      return NextResponse.json({ error: 'Invalid due date' }, { status: 400 });
    }
    if (dueDate.getTime() <= Date.now()) {
      return NextResponse.json({ error: 'The new due date must be in the future' }, { status: 400 });
    }

    const { data: record } = await (admin.from('borrow_records') as any)
      .select('id')
      .eq('id', params.id)
      .eq('status', 'active')
      .single();

    if (!record) {
      return NextResponse.json({ error: 'Active borrow record not found' }, { status: 404 });
    }

    const { data, error } = await (admin.from('borrow_records') as any)
      .update({ due_date: dueDate.toISOString() })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
