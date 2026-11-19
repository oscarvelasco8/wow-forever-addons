begin;
-- Shared test checkout budget.
create table private.support_test_checkout_budget (
  window_seconds integer not null check(window_seconds in (60,3600)),
  window_start timestamptz not null,
  requests integer not null check(requests between 1 and 30),
  primary key(window_seconds,window_start)
);
alter table private.support_test_checkout_budget enable row level security;
revoke all on private.support_test_checkout_budget from public,anon,authenticated;
grant usage on schema private to service_role;
grant select,insert,update,delete on private.support_test_checkout_budget to service_role;
create function public.admit_support_test_checkout() returns jsonb
language plpgsql security invoker set search_path='' as $$
declare budget_now timestamptz; minute_start timestamptz; hour_start timestamptz;
  minute_count integer; hour_count integer; wait_seconds integer:=0;
begin
  -- One database-owned guard shared by all API instances; no IP or caller identity.
  perform pg_catalog.pg_advisory_xact_lock(741831902113::bigint);
  budget_now:=pg_catalog.clock_timestamp();
  minute_start:=pg_catalog.date_trunc('minute',budget_now);
  hour_start:=pg_catalog.date_trunc('hour',budget_now);
  delete from private.support_test_checkout_budget where window_start < budget_now-interval '24 hours';
  select coalesce(max(requests),0) into minute_count from private.support_test_checkout_budget where window_seconds=60 and window_start=minute_start;
  select coalesce(max(requests),0) into hour_count from private.support_test_checkout_budget where window_seconds=3600 and window_start=hour_start;
  if minute_count>=6 then wait_seconds:=greatest(1,ceil(extract(epoch from minute_start+interval '1 minute'-budget_now))::integer); end if;
  if hour_count>=30 then wait_seconds:=greatest(wait_seconds,1,ceil(extract(epoch from hour_start+interval '1 hour'-budget_now))::integer); end if;
  if wait_seconds>0 then return jsonb_build_object('allowed',false,'retry_after',wait_seconds); end if;
  insert into private.support_test_checkout_budget(window_seconds,window_start,requests) values (60,minute_start,1),(3600,hour_start,1)
    on conflict(window_seconds,window_start) do update set requests=private.support_test_checkout_budget.requests+1;
  return jsonb_build_object('allowed',true,'retry_after',0);
end;
$$;
revoke all on function public.admit_support_test_checkout() from public,anon,authenticated;
grant execute on function public.admit_support_test_checkout() to service_role;
commit;
