begin;
-- Private test support ledger.
create table private.support_test_sessions (
  session_id text primary key check (session_id ~ '^cs_test_[A-Za-z0-9_]{1,240}$'),
  amount integer not null check (amount in (300,500,1000,2000)),
  currency text not null check (currency = 'eur'),
  state text not null check (state in ('pending','expired','failed','paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table private.support_test_events (
  event_id text primary key check (event_id ~ '^evt_[A-Za-z0-9_]{1,240}$'),
  event_type text not null check (event_type in ('checkout.session.completed','checkout.session.expired','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed')),
  session_id text not null references private.support_test_sessions(session_id),
  amount integer not null check (amount in (300,500,1000,2000)),
  currency text not null check (currency = 'eur'),
  state text not null check (state in ('pending','expired','failed','paid')),
  event_created bigint not null check (event_created > 0),
  received_at timestamptz not null default now()
);
create index support_test_events_session_idx on private.support_test_events(session_id);
alter table private.support_test_sessions enable row level security;
alter table private.support_test_events enable row level security;
revoke all on private.support_test_sessions, private.support_test_events from public, anon, authenticated;
grant usage on schema private to service_role;
grant select,insert,update on private.support_test_sessions to service_role;
grant select,insert on private.support_test_events to service_role;

create function public.record_support_test_event(p_event_id text,p_event_type text,p_session_id text,p_amount integer,p_currency text,p_state text,p_event_created bigint)
returns text language plpgsql security invoker set search_path='' as $$
declare existing private.support_test_events; session private.support_test_sessions;
begin
  if p_event_id is null or p_event_type is null or p_session_id is null or p_amount is null or p_currency is null or p_state is null or p_event_created is null then
    raise exception 'Missing event fields';
  end if;
  if not ((p_event_type='checkout.session.completed' and p_state in ('pending','paid')) or
    (p_event_type='checkout.session.expired' and p_state='expired') or
    (p_event_type='checkout.session.async_payment_succeeded' and p_state='paid') or
    (p_event_type='checkout.session.async_payment_failed' and p_state='failed')) then
    raise exception 'Inconsistent event state';
  end if;
  -- Serializes the same event even if a conflicting session ID is presented.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_event_id,0));
  select * into existing from private.support_test_events where event_id=p_event_id;
  if found then
    if existing.event_type<>p_event_type or existing.session_id<>p_session_id or existing.amount<>p_amount or existing.currency<>p_currency or existing.state<>p_state or existing.event_created<>p_event_created then
      raise exception 'Conflicting duplicate event';
    end if;
    return 'duplicate';
  end if;
  insert into private.support_test_sessions(session_id,amount,currency,state)
    values(p_session_id,p_amount,p_currency,p_state) on conflict(session_id) do nothing;
  select * into strict session from private.support_test_sessions where session_id=p_session_id for update;
  if session.amount<>p_amount or session.currency<>p_currency then raise exception 'Conflicting session amount'; end if;
  insert into private.support_test_events(event_id,event_type,session_id,amount,currency,state,event_created)
    values(p_event_id,p_event_type,p_session_id,p_amount,p_currency,p_state,p_event_created);
  -- Confirmation always wins. Pending or late expiry cannot erase it.
  if array_position(array['pending','expired','failed','paid'],p_state)>array_position(array['pending','expired','failed','paid'],session.state) then
    update private.support_test_sessions set state=p_state,updated_at=now() where session_id=p_session_id;
  end if;
  return 'recorded';
end;
$$;
revoke all on function public.record_support_test_event(text,text,text,integer,text,text,bigint) from public,anon,authenticated;
grant execute on function public.record_support_test_event(text,text,text,integer,text,text,bigint) to service_role;
commit;
