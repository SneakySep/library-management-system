-- ---------------------------------------------------------------------------
-- 004: security hardening
-- Run this in the Supabase SQL editor AFTER 001–003.
--
-- 1. Drop the "Users create own borrow records" policy. It let a signed-in
--    member INSERT rows straight into borrow_records through PostgREST,
--    bypassing every rule enforced by /api/borrow-records (available copies,
--    per-user limit, loan period) and drifting available_copies out of sync.
--    Every borrow/return in the app is written by API routes using the
--    service role, so no application code relies on this policy.
--
-- 2. guard_role_change() only covered UPDATEs, so a user whose profile row
--    was missing could insert one for themselves with role = 'librarian'.
--    Extend the trigger to INSERT as well: a user may only create their own
--    profile with role = 'member'. Librarians and the service role (SQL
--    editor / server-side scripts, where auth.uid() is null) can still set
--    any role.
-- ---------------------------------------------------------------------------

drop policy if exists "Users create own borrow records" on public.borrow_records;

create or replace function public.guard_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.role is distinct from 'member'
       and auth.uid() = new.id
       and not public.is_librarian() then
      raise exception 'Only librarians can set roles';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.role is distinct from old.role
       and auth.uid() = old.id
       and not public.is_librarian() then
      raise exception 'Only librarians can change roles';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_role_change on public.users;
create trigger guard_role_change
  before insert or update on public.users
  for each row
  execute procedure public.guard_role_change();

-- Optional check after running this:
--   * A member session POSTing a borrow_record to /rest/v1/borrow_records
--     should now fail with "new row violates row-level security policy".
--   * Signing up a new account must still create a users row with
--     role = 'member'.
