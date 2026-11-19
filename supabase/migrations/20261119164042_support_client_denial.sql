begin;
create policy deny_client_access on private.support_test_sessions as restrictive for all to anon,authenticated using(false) with check(false);
create policy deny_client_access on private.support_test_events as restrictive for all to anon,authenticated using(false) with check(false);
create policy deny_client_access on private.support_test_checkout_budget as restrictive for all to anon,authenticated using(false) with check(false);
commit;
