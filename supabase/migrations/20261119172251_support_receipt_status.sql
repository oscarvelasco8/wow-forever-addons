begin;
create function public.read_support_test_status(p_session_id text) returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('state',state,'amount',amount,'currency',currency)
 from private.support_test_sessions where session_id=p_session_id;
$$;
revoke all on function public.read_support_test_status(text) from public,anon,authenticated;
grant execute on function public.read_support_test_status(text) to service_role;
commit;
