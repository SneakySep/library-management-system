import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('users').select('*');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Merge Auth metadata (suspension state, last sign-in) into the profiles.
    // Best-effort: the list still renders if the Auth API is unavailable.
    const meta = new Map<string, { banned_until: string | null; last_sign_in_at: string | null }>();
    try {
      const admin = createAdminClient();
      const perPage = 1000;
      for (let page = 1; ; page += 1) {
        const { data: authData, error: authError } = await admin.auth.admin.listUsers({
          page,
          perPage,
        });
        if (authError) break;
        for (const authUser of authData.users) {
          meta.set(authUser.id, {
            banned_until: authUser.banned_until ?? null,
            last_sign_in_at: authUser.last_sign_in_at ?? null,
          });
        }
        if (authData.users.length < perPage) break;
      }
    } catch {
      // Ignore — auth metadata is optional.
    }

    const users = (data ?? []).map((profile: any) => ({
      ...profile,
      banned_until: meta.get(profile.id)?.banned_until ?? null,
      last_sign_in_at: meta.get(profile.id)?.last_sign_in_at ?? null,
    }));

    return NextResponse.json(users);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

interface UserInsert {
  id: string;
  full_name: string;
  email: string;
  role: 'member' | 'librarian';
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const body = (await req.json()) as UserInsert;

    const { data, error } = await (supabase.from('users') as any)
      .insert([body])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
