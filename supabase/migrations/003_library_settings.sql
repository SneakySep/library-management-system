-- ---------------------------------------------------------------------------
-- 003: library settings (single-row table)
-- Stores the borrowing rules managed from Admin → Settings.
-- Run this in the Supabase SQL editor.
-- ---------------------------------------------------------------------------

create table if not exists public.library_settings (
  id integer primary key default 1 check (id = 1),
  loan_period_days integer not null default 14 check (loan_period_days between 1 and 365),
  max_books_per_user integer not null default 5 check (max_books_per_user between 1 and 100),
  updated_at timestamptz not null default now()
);

insert into public.library_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.library_settings enable row level security;

-- Any signed-in user may read the rules (checkout logic depends on them).
drop policy if exists "Settings readable by authenticated" on public.library_settings;
create policy "Settings readable by authenticated"
  on public.library_settings for select to authenticated
  using (true);

-- Only librarians may change them.
drop policy if exists "Librarians update settings" on public.library_settings;
create policy "Librarians update settings"
  on public.library_settings for update to authenticated
  using (public.is_librarian()) with check (public.is_librarian());
