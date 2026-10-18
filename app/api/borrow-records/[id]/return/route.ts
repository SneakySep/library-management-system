import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Identify the signed-in user from their session cookies.
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'You must be signed in to return a book' },
        { status: 401 }
      );
    }

    const admin = createAdminClient();

    // Get the current record to verify it exists and is active
    const { data: record, error: fetchError } = await (admin.from('borrow_records') as any)
      .select('*')
      .eq('id', params.id)
      .eq('status', 'active')
      .single();

    if (fetchError || !record) {
      return NextResponse.json(
        { error: 'Active borrow record not found' },
        { status: 404 }
      );
    }

    // Only the borrower or a librarian may return the book.
    if (record.user_id !== user.id) {
      const { data: profile } = await (admin.from('users') as any)
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'librarian') {
        return NextResponse.json(
          { error: 'You cannot return this borrow record' },
          { status: 403 }
        );
      }
    }

    // Mark the record as returned
    const { data, error } = await (admin.from('borrow_records') as any)
      .update({
        status: 'returned',
        returned_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Increment available copies for the book
    if (record.book_id) {
      const { data: book } = await (admin.from('books') as any)
        .select('available_copies, total_copies')
        .eq('id', record.book_id)
        .single();

      if (book) {
        const newAvailable = Math.min(
          book.available_copies + 1,
          book.total_copies
        );
        await (admin.from('books') as any)
          .update({
            available_copies: newAvailable,
            updated_at: new Date().toISOString(),
          })
          .eq('id', record.book_id);
      }
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
