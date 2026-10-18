import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getLibrarySettings } from '@/lib/settings';

/** Returns the admin client when the caller is a librarian, or an error response. */
async function getLibrarianContext() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: 'You must be signed in' }, { status: 401 }) } as const;
  }

  const admin = createAdminClient();
  const { data: profile } = await (admin.from('users') as any)
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'librarian') {
    return { error: NextResponse.json({ error: 'Only librarians can manage settings' }, { status: 403 }) } as const;
  }

  return { admin, user } as const;
}

export async function GET() {
  try {
    const auth = await getLibrarianContext();
    if ('error' in auth) return auth.error;

    const settings = await getLibrarySettings();
    return NextResponse.json(settings);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await getLibrarianContext();
    if ('error' in auth) return auth.error;

    const body = (await req.json()) as { loan_period_days?: unknown; max_books_per_user?: unknown };

    const loan = Number(body.loan_period_days);
    const max = Number(body.max_books_per_user);

    if (!Number.isInteger(loan) || loan < 1 || loan > 365) {
      return NextResponse.json({ error: 'Loan period must be a whole number between 1 and 365 days' }, { status: 400 });
    }
    if (!Number.isInteger(max) || max < 1 || max > 100) {
      return NextResponse.json({ error: 'Max books per member must be a whole number between 1 and 100' }, { status: 400 });
    }

    const { data, error } = await (auth.admin.from('library_settings') as any)
      .upsert({
        id: 1,
        loan_period_days: loan,
        max_books_per_user: max,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      const message = /does not exist/i.test(error.message)
        ? 'Settings table not found — run migration 003_library_settings.sql in the Supabase SQL editor.'
        : error.message;
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({
      loan_period_days: data.loan_period_days,
      max_books_per_user: data.max_books_per_user,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
