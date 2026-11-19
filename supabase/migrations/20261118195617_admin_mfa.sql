begin;

-- Membership may be checked before enrollment, but grants no content privileges.
create function private.has_admin_membership() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from private.admin_users where user_id = (select auth.uid()));
$$;
revoke all on function private.has_admin_membership() from public;
grant execute on function private.has_admin_membership() to authenticated;

-- Existing table AND Storage policies all call this helper.
create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select auth.jwt()->>'aal') = 'aal2', false)
    and case when (select auth.uid()) is not null
      then private.has_admin_membership() else false end;
$$;

-- Narrow API: callers can ask only about themselves, never enumerate accounts.
create function public.admin_access() returns text
language sql stable security invoker set search_path = ''
as $$
  select case when not private.has_admin_membership() then 'forbidden'
    when private.is_admin() then 'admin' else 'mfa-required' end;
$$;
revoke all on function public.admin_access() from public, anon;
grant execute on function public.admin_access() to authenticated;

commit;
