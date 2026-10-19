import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireLibrarian } from '@/lib/api-auth';

/** Lifts a suspension so the member can sign in again. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId, error } = await requireLibrarian();
    if (error) return error;

    const admin = createAdminClient();

    const { data: target } = await (admin.from('users') as any)
      .select('id')
      .eq('id', id)
      .single();

    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { error: unbanError } = await admin.auth.admin.updateUserById(id, {
      ban_duration: 'none',
    });

    if (unbanError) {
      return NextResponse.json({ error: unbanError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
