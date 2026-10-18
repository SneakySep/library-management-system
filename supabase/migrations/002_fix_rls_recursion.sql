-- supabase/migrations/002_fix_rls_recursion.sql
-- Fixes "infinite recursion detected in policy for relation \"users\"" (error 42P17).
-- Run this in the Supabase SQL Editor AFTER 001_initial_schema.sql.
--
-- Why this happens: the policies from 001 check the librarian role with
--   exists (select 1 from public.users where ... and role = 'librarian')
-- When a policy on public.users itself queries public.users, Postgres keeps
-- evaluating the same policy forever -> 42P17. Every table whose policies
-- reference public.users fails too (books, borrow_records), so ALL reads and
-- writes via the anon/authenticated keys were failing.

-- ---------------------------------------------------------------------------
-- 1. Helper function that checks the librarian role WITHOUT re-triggering RLS.
--    SECURITY DEFINER runs as the function owner (postgres, i.e. the table
--    owner), which bypasses RLS on public.users, so there is no recursion.
-- ---------------------------------------------------------------------------
create or replace function public.is_librarian()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'librarian'
  );
$$;

grant execute on function public.is_librarian() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. books — replace the recursive "FOR ALL" policy with explicit write
--    policies. (A FOR ALL policy also applies to SELECT, which is why even
--    anonymous reads of books were failing.)
-- ---------------------------------------------------------------------------
drop policy if exists "Librarians manage books" on public.books;

drop policy if exists "Librarians insert books" on public.books;
create policy "Librarians insert books"
  on public.books for insert to authenticated
  with check (public.is_librarian());

drop policy if exists "Librarians update books" on public.books;
create policy "Librarians update books"
  on public.books for update to authenticated
  using (public.is_librarian())
  with check (public.is_librarian());

drop policy if exists "Librarians delete books" on public.books;
create policy "Librarians delete books"
  on public.books for delete to authenticated
  using (public.is_librarian());

-- ---------------------------------------------------------------------------
-- 3. users — remove the recursive policies and add a librarian update policy
--    (the app's "change role" feature needs it).
-- ---------------------------------------------------------------------------
drop policy if exists "Librarians read all profiles" on public.users;
create policy "Librarians read all profiles"
  on public.users for select to authenticated
  using (public.is_librarian());

drop policy if exists "Librarians update all profiles" on public.users;
create policy "Librarians update all profiles"
  on public.users for update to authenticated
  using (public.is_librarian())
  with check (public.is_librarian());

-- Members must not be able to promote themselves to librarian.
-- (auth.uid() is null for the SQL editor / service role, so bootstrapping the
-- first librarian still works.)
create or replace function public.guard_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() = old.id
     and not public.is_librarian() then
    raise exception 'Only librarians can change roles';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_role_change on public.users;
create trigger guard_role_change
  before update on public.users
  for each row
  execute procedure public.guard_role_change();

-- ---------------------------------------------------------------------------
-- 4. borrow_records — replace the recursive librarian policies.
-- ---------------------------------------------------------------------------
drop policy if exists "Librarians read all borrow records" on public.borrow_records;
create policy "Librarians read all borrow records"
  on public.borrow_records for select to authenticated
  using (public.is_librarian());

drop policy if exists "Librarians manage borrow records" on public.borrow_records;

drop policy if exists "Librarians insert borrow records" on public.borrow_records;
create policy "Librarians insert borrow records"
  on public.borrow_records for insert to authenticated
  with check (public.is_librarian());

drop policy if exists "Librarians update borrow records" on public.borrow_records;
create policy "Librarians update borrow records"
  on public.borrow_records for update to authenticated
  using (public.is_librarian())
  with check (public.is_librarian());

drop policy if exists "Librarians delete borrow records" on public.borrow_records;
create policy "Librarians delete borrow records"
  on public.borrow_records for delete to authenticated
  using (public.is_librarian());

-- Optional check: after running this, anonymous reads should work, e.g.:
--   curl "https://<your-project>.supabase.co/rest/v1/books?select=id&limit=1" \
--     -H "apikey: <anon key>"
