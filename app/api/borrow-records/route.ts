import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getLibrarySettings } from '@/lib/settings';

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const book_id = searchParams.get('book_id');

    let query = supabase
      .from('borrow_records')
      .select(`
        *,
        user:users(id, full_name, email, role),
        book:books(id, title, author, isbn, cover_url, genre, available_copies, total_copies)
      `);

    if (book_id) {
      query = query.eq('book_id', book_id);
    }

    const { data, error } = await query.order('borrowed_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Identify the signed-in user from their session cookies.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'You must be signed in to check out a book' },
        { status: 401 }
      );
    }

    const body = (await req.json()) as { book_id?: string; user_id?: string };
    if (!body.book_id) {
      return NextResponse.json({ error: 'book_id is required' }, { status: 400 });
    }

    // Stock updates are performed with the service-role client: members are not
    // allowed to update books under RLS, and the borrow record + stock change
    // must both succeed.
    const admin = createAdminClient();

    // Members can only check out for themselves; librarians may issue books to
    // any member (desk checkout).
    let targetUserId = user.id;
    if (body.user_id && body.user_id !== user.id) {
      const { data: requester } = await (admin.from('users') as any)
        .select('role')
        .eq('id', user.id)
        .single();

      if (!requester || requester.role !== 'librarian') {
        return NextResponse.json(
          { error: 'Only librarians can check out books for other members' },
          { status: 403 }
        );
      }

      const { data: target } = await (admin.from('users') as any)
        .select('id')
        .eq('id', body.user_id)
        .maybeSingle();

      if (!target) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }

      targetUserId = body.user_id;
    }

    const settings = await getLibrarySettings();

    const { data: book, error: bookError } = await (admin.from('books') as any)
      .select('id, available_copies, total_copies')
      .eq('id', body.book_id)
      .single();

    if (bookError || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    if (book.available_copies <= 0) {
      return NextResponse.json(
        { error: 'This book is currently not available for checkout' },
        { status: 409 }
      );
    }

    const { data: existing } = await (admin.from('borrow_records') as any)
      .select('id')
      .eq('user_id', targetUserId)
      .eq('book_id', body.book_id)
      .eq('status', 'active')
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          error:
            targetUserId === user.id
              ? 'You have already checked out this book'
              : 'This member has already checked out this book',
        },
        { status: 409 }
      );
    }

    // Enforce the per-member borrowing limit from library settings.
    const { count: activeCount } = await (admin.from('borrow_records') as any)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', targetUserId)
      .eq('status', 'active');

    if ((activeCount ?? 0) >= settings.max_books_per_user) {
      return NextResponse.json(
        {
          error:
            targetUserId === user.id
              ? `Borrowing limit reached — you already have ${activeCount} active loans (limit: ${settings.max_books_per_user})`
              : `Borrowing limit reached — this member already has ${activeCount} active loans (limit: ${settings.max_books_per_user})`,
        },
        { status: 409 }
      );
    }

    const borrowedAt = new Date();
    const dueDate = new Date(
      borrowedAt.getTime() + settings.loan_period_days * 24 * 60 * 60 * 1000
    );

    const { data, error } = await (admin.from('borrow_records') as any)
      .insert([
        {
          user_id: targetUserId,
          book_id: book.id,
          borrowed_at: borrowedAt.toISOString(),
          due_date: dueDate.toISOString(),
          status: 'active',
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Decrement available copies.
    await (admin.from('books') as any)
      .update({
        available_copies: Math.max(book.available_copies - 1, 0),
        updated_at: new Date().toISOString(),
      })
      .eq('id', book.id);

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
