import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from('users').select('*');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
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
    const supabase = createClient();
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