import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', params.id)
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
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
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
    if (!isLibrarian && (user.id !== params.id || body.role)) {
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
      .eq('id', params.id)
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
