begin;

-- Immutable to application roles. No credentials or Auth payloads are recorded.
create table public.editorial_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default clock_timestamp(),
  actor_id uuid,
  addon_id uuid not null,
  entity text not null,
  entity_id uuid not null,
  operation text not null check (operation in ('INSERT','UPDATE','DELETE')),
  before_data jsonb,
  after_data jsonb,
  changed_fields text[] not null default '{}',
  note text not null default '' check (length(note) <= 1000)
);
create index editorial_events_addon_time_idx on public.editorial_events(addon_id, occurred_at desc, id);
alter table public.editorial_events enable row level security;
revoke all on public.editorial_events from public, anon, authenticated;
grant select on public.editorial_events to authenticated;
create policy admin_read_events on public.editorial_events for select to authenticated
using ((select private.is_admin()));

-- A private definer is needed only to append to the otherwise read-only journal.
create function private.record_editorial_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare previous jsonb; following jsonb; row_data jsonb; changed text[];
begin
  if tg_op <> 'INSERT' then previous := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then following := to_jsonb(new); end if;
  row_data := coalesce(following, previous);
  select coalesce(array_agg(key order by key),'{}') into changed
  from jsonb_object_keys(row_data) as keys(key)
  where key<>'updated_at' and (previous->key) is distinct from (following->key);
  insert into public.editorial_events(actor_id,addon_id,entity,entity_id,operation,before_data,after_data,changed_fields,note)
  values (auth.uid(), case when tg_table_name='addons' then (row_data->>'id')::uuid else (row_data->>'addon_id')::uuid end,
    tg_table_name,(row_data->>'id')::uuid,tg_op,
    previous - array['description','credits','installation_instructions','changelog'],
    following - array['description','credits','installation_instructions','changelog'],
    changed,
    left(coalesce(current_setting('wfa.editorial_note',true),''),1000));
  return coalesce(new,old);
end;
$$;
revoke all on function private.record_editorial_event() from public,anon,authenticated;
create trigger editorial_audit after insert or update or delete on public.addons
for each row execute function private.record_editorial_event();
create trigger editorial_audit after insert or update or delete on public.addon_releases
for each row execute function private.record_editorial_event();
create trigger editorial_audit after insert or update or delete on public.addon_images
for each row execute function private.record_editorial_event();

-- RLS remains active. Locks and timestamps make the checked transition atomic.
create function public.editorial_action(
  p_addon_id uuid, p_entity text, p_id uuid, p_expected timestamptz,
  p_action text, p_note text, p_alt text default null, p_order integer default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare a public.addons; r public.addon_releases; i public.addon_images; result jsonb;
begin
  if not private.is_admin() then raise exception 'EDITORIAL_DENIED' using errcode='42501'; end if;
  if p_expected is null or p_note is null or length(trim(p_note)) not between 12 and 1000 then
    raise exception 'EDITORIAL_NOTE_REQUIRED' using errcode='22023';
  end if;
  select * into a from public.addons where id=p_addon_id for update;
  if not found then raise exception 'EDITORIAL_CONFLICT' using errcode='40001'; end if;
  perform set_config('wfa.editorial_note',trim(p_note),true);
  if p_entity='addon' and p_id=p_addon_id then
    if a.updated_at <> p_expected then raise exception 'EDITORIAL_CONFLICT' using errcode='40001'; end if;
    if p_action='approve' and a.status='draft' and not a.distribution_approved then
      if lower(trim(a.license_name)) in ('','pending review','pendiente','pendiente de revisión') then
        raise exception 'EDITORIAL_LICENSE_REQUIRED' using errcode='22023';
      end if;
      update public.addons set distribution_approved=true where id=a.id returning to_jsonb(addons.*) into result;
    elsif p_action='publish' and a.status='draft' and a.distribution_approved then
      perform 1 from public.categories where id=a.category_id and is_visible for share;
      if not found then raise exception 'EDITORIAL_CATEGORY_HIDDEN' using errcode='22023'; end if;
      if not exists(select 1 from public.addon_releases where addon_id=a.id and status='published' and published_at<=now()) then
        raise exception 'EDITORIAL_RELEASE_REQUIRED' using errcode='22023';
      end if;
      update public.addons set status='published',published_at=now() where id=a.id returning to_jsonb(addons.*) into result;
    elsif p_action='withdraw' and a.status='published' then
      -- Hide children too: returning the parent to public must not resurrect them.
      update public.addon_releases set status='archived' where addon_id=a.id and status='published';
      update public.addon_images set is_published=false where addon_id=a.id and is_published;
      update public.addons set status='draft',published_at=null,distribution_approved=false where id=a.id returning to_jsonb(addons.*) into result;
    elsif p_action='revoke' and a.status='draft' and a.distribution_approved then
      update public.addons set distribution_approved=false where id=a.id returning to_jsonb(addons.*) into result;
    else raise exception 'EDITORIAL_TRANSITION_INVALID' using errcode='22023'; end if;
  elsif p_entity='release' then
    select * into r from public.addon_releases where id=p_id and addon_id=a.id for update;
    if not found or r.updated_at<>p_expected then raise exception 'EDITORIAL_CONFLICT' using errcode='40001'; end if;
    if p_action='publish' and r.status='draft' and a.distribution_approved then
      if r.file_path is null or r.sha256 is null or r.file_size_bytes is null or r.file_size_bytes>52428800
        or not exists(select 1 from storage.objects where bucket_id='addon-files' and name=r.file_path) then
        raise exception 'EDITORIAL_FILE_REQUIRED' using errcode='22023';
      end if;
      update public.addon_releases set status='published',published_at=now() where id=r.id returning to_jsonb(addon_releases.*) into result;
    elsif p_action='withdraw' and r.status='published' then
      update public.addon_releases set status='archived' where id=r.id returning to_jsonb(addon_releases.*) into result;
    elsif p_action='draft' and r.status='archived' then
      update public.addon_releases set status='draft',published_at=null where id=r.id returning to_jsonb(addon_releases.*) into result;
    else raise exception 'EDITORIAL_TRANSITION_INVALID' using errcode='22023'; end if;
  elsif p_entity='image' then
    select * into i from public.addon_images where id=p_id and addon_id=a.id for update;
    if not found or i.updated_at<>p_expected then raise exception 'EDITORIAL_CONFLICT' using errcode='40001'; end if;
    if p_action='edit' then
      if p_alt is null or length(trim(p_alt)) not between 1 and 300 or p_order is null or p_order<0 then
        raise exception 'EDITORIAL_IMAGE_FIELDS' using errcode='22023';
      end if;
      update public.addon_images set alt_text=trim(p_alt),sort_order=p_order where id=i.id returning to_jsonb(addon_images.*) into result;
    elsif p_action='publish' and not i.is_published and a.distribution_approved then
      if not exists(select 1 from storage.objects where bucket_id='addon-images' and name=i.file_path) then
        raise exception 'EDITORIAL_FILE_REQUIRED' using errcode='22023';
      end if;
      update public.addon_images set is_published=true where id=i.id returning to_jsonb(addon_images.*) into result;
    elsif p_action='withdraw' and i.is_published then
      update public.addon_images set is_published=false where id=i.id returning to_jsonb(addon_images.*) into result;
    else raise exception 'EDITORIAL_TRANSITION_INVALID' using errcode='22023'; end if;
  else raise exception 'EDITORIAL_TRANSITION_INVALID' using errcode='22023'; end if;
  perform set_config('wfa.editorial_note','',true);
  return result;
end;
$$;
revoke all on function public.editorial_action(uuid,text,uuid,timestamptz,text,text,text,integer) from public,anon;
grant execute on function public.editorial_action(uuid,text,uuid,timestamptz,text,text,text,integer) to authenticated;
commit;
