import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const isbn = searchParams.get('isbn');
    const query = searchParams.get('q');

    if (!isbn && !query) {
      return NextResponse.json({ error: 'ISBN or query required' }, { status: 400 });
    }

    let url = '';
    if (isbn) {
      url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`;
    } else if (query) {
      url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5`;
    } else {
      return NextResponse.json({ error: 'ISBN or query required' }, { status: 400 });
    }

    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ error: 'Open Library API error' }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}