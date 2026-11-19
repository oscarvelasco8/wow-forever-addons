begin;
alter table public.categories add column sort_order integer not null default 0 check (sort_order>=0);
-- Category events have no parent addon. Application roles still cannot write the journal.
alter table public.editorial_events alter column addon_id drop not null;
create index editorial_events_entity_time_idx on public.editorial_events(entity,occurred_at desc,id);

create or replace function private.record_editorial_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare previous jsonb; following jsonb; row_data jsonb; changed text[];
begin
  if tg_op <> 'INSERT' then previous := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then following := to_jsonb(new); end if;
  row_data := coalesce(following,previous);
  select coalesce(array_agg(key order by key),'{}') into changed
    from jsonb_object_keys(row_data) as keys(key)
    where key<>'updated_at' and (previous->key) is distinct from (following->key);
  insert into public.editorial_events(actor_id,addon_id,entity,entity_id,operation,before_data,after_data,changed_fields,note)
  values(auth.uid(),case when tg_table_name='categories' then null when tg_table_name='addons' then (row_data->>'id')::uuid else (row_data->>'addon_id')::uuid end,
    tg_table_name,(row_data->>'id')::uuid,tg_op,
    previous-array['description','credits','installation_instructions','changelog'],
    following-array['description','credits','installation_instructions','changelog'],changed,
    left(coalesce(current_setting('wfa.editorial_note',true),''),1000));
  return coalesce(new,old);
end;
$$;
revoke all on function private.record_editorial_event() from public,anon,authenticated;
create trigger editorial_audit after insert or update or delete on public.categories
for each row execute function private.record_editorial_event();

create function public.save_category(
  p_name text, p_slug text, p_sort integer, p_visible boolean, p_note text,
  p_id uuid default null, p_expected timestamptz default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare c public.categories; result jsonb;
begin
  if not private.is_admin() then raise exception 'CATEGORY_DENIED' using errcode='42501'; end if;
  if p_name is null or length(trim(p_name)) not between 1 and 80 or p_slug is null
    or length(p_slug) not between 1 and 100 or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or p_sort is null or p_sort<0 or p_visible is null or p_note is null or length(trim(p_note)) not between 12 and 1000 then
    raise exception 'CATEGORY_FIELDS_INVALID' using errcode='22023';
  end if;
  perform set_config('wfa.editorial_note',trim(p_note),true);
  if p_id is null then
    if p_visible or p_expected is not null then raise exception 'CATEGORY_CREATE_HIDDEN' using errcode='22023'; end if;
    insert into public.categories(name,slug,sort_order,is_visible) values(trim(p_name),p_slug,p_sort,false)
      returning to_jsonb(categories.*) into result;
  else
    select * into c from public.categories where id=p_id for update;
    if not found or p_expected is null or c.updated_at<>p_expected then raise exception 'CATEGORY_CONFLICT' using errcode='40001'; end if;
    update public.categories set name=trim(p_name),slug=p_slug,sort_order=p_sort,is_visible=p_visible where id=c.id
      returning to_jsonb(categories.*) into result;
  end if;
  perform set_config('wfa.editorial_note','',true);
  return result;
end;
$$;
revoke all on function public.save_category(text,text,integer,boolean,text,uuid,timestamptz) from public,anon;
grant execute on function public.save_category(text,text,integer,boolean,text,uuid,timestamptz) to authenticated;
commit;
