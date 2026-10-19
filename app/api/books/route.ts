import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Book } from '@/types';
import type { PaginatedResponse } from '@/types';

const DEFAULT_PAGE_SIZE = 20;

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? '';
    const genre = searchParams.get('genre') ?? '';
    const availability = searchParams.get('availability') ?? '';
    const publication_year = searchParams.get('publication_year') ?? '';
    const min_rating = searchParams.get('min_rating') ?? '';
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') ?? String(DEFAULT_PAGE_SIZE), 10);

    let query = supabase.from('books').select('*', { count: 'exact' });

    if (search) {
      query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%`);
    }
    if (genre && genre !== 'All') {
      query = query.eq('genre', genre);
    }
    if (publication_year) {
      query = query
        .gte('created_at', `${publication_year}-01-01`)
        .lte('created_at', `${publication_year}-12-31`);
    }
    if (min_rating) {
      query = query.gte('rating', parseFloat(min_rating));
    }

    const withStatus = (b: any): Book => ({
      ...b,
      availability_status:
        b.available_copies === 0 ? 'Checked Out' :
        b.available_copies < b.total_copies ? 'Reserved' :
        'Available',
    });

    const hasAvailabilityFilter = Boolean(availability) && availability !== 'All';
    const ordered = query.order('created_at', { ascending: false });

    let booksWithStatus: Book[];
    let totalCount: number;

    if (hasAvailabilityFilter) {
      // Availability is computed from copy counts, so filter all matching rows first
      // and paginate afterwards — otherwise totals and page 2+ would be wrong.
      const { data, error } = await ordered;

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const filtered = (data || [])
        .map(withStatus)
        .filter((b) => b.availability_status === availability);

      totalCount = filtered.length;
      booksWithStatus = filtered.slice((page - 1) * pageSize, page * pageSize);
    } else {
      const { data, error, count } = await ordered.range(
        (page - 1) * pageSize,
        page * pageSize - 1
      );

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      booksWithStatus = (data || []).map(withStatus);
      totalCount = count ?? booksWithStatus.length;
    }

    const totalPages = Math.ceil(totalCount / pageSize);

    const response: PaginatedResponse<Book> = {
      data: booksWithStatus,
      count: totalCount,
    };

    // Add pagination headers
    const json = NextResponse.json(response, { status: 200 });
    json.headers.set('X-Total-Count', String(totalCount));
    json.headers.set('X-Total-Pages', String(totalPages));
    json.headers.set('X-Current-Page', String(page));
    json.headers.set('X-Page-Size', String(pageSize));

    return json;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const body = await req.json() as Partial<Record<string, unknown>>;

    const { data, error } = await (supabase.from('books') as any).insert([body]).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
