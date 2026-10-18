-- supabase/migrations/001_initial_schema.sql
-- Library Management System — initial schema
-- Run this in the Supabase SQL Editor.

-- 1. Extensions & enums
create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('member', 'librarian');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'borrow_status') then
    create type borrow_status as enum ('active', 'returned', 'overdue');
  end if;
end $$;

-- 2. books
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  isbn text unique,
  cover_url text,
  description text,
  genre text not null default 'General',
  rating numeric(2,1) default 0 check (rating >= 0 and rating <= 5),
  total_copies integer not null default 1 check (total_copies >= 0),
  available_copies integer not null default 1 check (available_copies >= 0 and available_copies <= total_copies),
  location_rack text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. users (profiles tied to Supabase Auth)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text unique,
  role user_role not null default 'member',
  created_at timestamptz not null default now()
);

-- 4. borrow_records
create table if not exists public.borrow_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  borrowed_at timestamptz not null default now(),
  due_date timestamptz not null,
  returned_at timestamptz,
  status borrow_status not null default 'active',
  created_at timestamptz not null default now(),
  constraint valid_dates check (returned_at is null or returned_at >= borrowed_at)
);

-- 5. Indexes
create index if not exists idx_books_genre on public.books(genre);
create index if not exists idx_books_isbn on public.books(isbn);
create index if not exists idx_books_available on public.books(available_copies);
create index if not exists idx_borrow_records_user on public.borrow_records(user_id);
create index if not exists idx_borrow_records_book on public.borrow_records(book_id);
create index if not exists idx_borrow_records_status on public.borrow_records(status);
create index if not exists idx_borrow_records_user_status on public.borrow_records(user_id, status);

-- 6. Row Level Security
alter table public.books enable row level security;
alter table public.users enable row level security;
alter table public.borrow_records enable row level security;

-- Books: everyone can read; only librarians can write
drop policy if exists "Books are publicly readable" on public.books;
create policy "Books are publicly readable"
  on public.books for select using (true);

drop policy if exists "Librarians manage books" on public.books;
create policy "Librarians manage books"
  on public.books for all
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'librarian')
  )
  with check (
    exists (select 1 from public.users where id = auth.uid() and role = 'librarian')
  );

-- Users: read own profile + librarians read all; insert/update own
drop policy if exists "Users read own profile" on public.users;
create policy "Users read own profile"
  on public.users for select using (auth.uid() = id);

drop policy if exists "Librarians read all profiles" on public.users;
create policy "Librarians read all profiles"
  on public.users for select using (
    exists (select 1 from public.users where id = auth.uid() and role = 'librarian')
  );

drop policy if exists "Users insert own profile" on public.users;
create policy "Users insert own profile"
  on public.users for insert with check (auth.uid() = id);

drop policy if exists "Users update own profile" on public.users;
create policy "Users update own profile"
  on public.users for update using (auth.uid() = id) with check (auth.uid() = id);

-- Borrow records: users read own; librarians read/manage all; users create their own
drop policy if exists "Users read own borrow records" on public.borrow_records;
create policy "Users read own borrow records"
  on public.borrow_records for select using (auth.uid() = user_id);

drop policy if exists "Librarians read all borrow records" on public.borrow_records;
create policy "Librarians read all borrow records"
  on public.borrow_records for select using (
    exists (select 1 from public.users where id = auth.uid() and role = 'librarian')
  );

drop policy if exists "Users create own borrow records" on public.borrow_records;
create policy "Users create own borrow records"
  on public.borrow_records for insert with check (auth.uid() = user_id);

drop policy if exists "Librarians manage borrow records" on public.borrow_records;
create policy "Librarians manage borrow records"
  on public.borrow_records for all
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'librarian')
  )
  with check (
    exists (select 1 from public.users where id = auth.uid() and role = 'librarian')
  );

-- 7. Auto-create profile when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    'member'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();
