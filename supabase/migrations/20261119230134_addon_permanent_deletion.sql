begin;
-- Durable deletion markers survive the content row; audit history is retained.
create table private.addon_deletions (
 addon_id uuid primary key,
 addon_name text not null,
 requested_at timestamptz not null default now()
);
alter table private.addon_deletions enable row level security;
revoke all on private.addon_deletions from public,anon,authenticated;
grant select,insert on private.addon_deletions to authenticated;
create policy admin_read on private.addon_deletions for select to authenticated using((select private.is_admin()));
create policy admin_insert on private.addon_deletions for insert to authenticated with check((select private.is_admin()));

create function private.block_deleting_addon() returns trigger language plpgsql security invoker set search_path='' as $$
declare a uuid;
begin
 if tg_table_name='addons' then a:=new.id; else a:=new.addon_id; end if;
 perform 1 from public.addons where id=a for update;
 if exists(select 1 from private.addon_deletions where addon_id=a) then raise exception 'ADDON_DELETING' using errcode='40001'; end if;
 return new;
end;$$;
revoke all on function private.block_deleting_addon() from public;
create trigger stop_deleting_addon before insert or update on public.addons for each row execute function private.block_deleting_addon();
create trigger stop_deleting_release before insert or update on public.addon_releases for each row execute function private.block_deleting_addon();
create trigger stop_deleting_image before insert or update on public.addon_images for each row execute function private.block_deleting_addon();

-- Serialize uploads with deletion. Checking a flag without this parent lock would
-- allow a metadata transaction begun earlier to leave a late orphaned object.
create function private.addon_accepts_upload(p_path text) returns boolean language plpgsql security invoker set search_path='' as $$
declare a uuid;
begin
 if not private.is_admin() then return false; end if;
 if split_part(p_path,'/',1) !~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then return true; end if;
 a:=split_part(p_path,'/',1)::uuid;
 perform 1 from public.addons where id=a for share;
 return found and not exists(select 1 from private.addon_deletions where addon_id=a);
end;$$;
revoke all on function private.addon_accepts_upload(text) from public,anon;
grant execute on function private.addon_accepts_upload(text) to authenticated;
create policy protect_deleting_storage_insert on storage.objects as restrictive for insert to authenticated
with check(bucket_id not in ('addon-files','addon-images') or private.addon_accepts_upload(name));
create policy protect_deleting_storage_update on storage.objects as restrictive for update to authenticated
using(bucket_id not in ('addon-files','addon-images') or private.addon_accepts_upload(name))
with check(bucket_id not in ('addon-files','addon-images') or private.addon_accepts_upload(name));
-- A trigger avoids a recursive addons -> Storage -> addons RLS dependency.
create function private.block_addon_delete_storage() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if exists(select 1 from storage.objects o where o.bucket_id in ('addon-files','addon-images') and o.name like old.id::text||'/%') then raise exception 'ADDON_CLEANUP_PENDING' using errcode='40001'; end if;
 return old;
end;$$;
revoke all on function private.block_addon_delete_storage() from public;
create trigger protect_addon_delete_storage before delete on public.addons for each row execute function private.block_addon_delete_storage();

create function public.addon_deletion_pending() returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 if not private.is_admin() then raise exception 'ADDON_DELETE_DENIED' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(d.addon_id) from private.addon_deletions d join public.addons a on a.id=d.addon_id),'[]'::jsonb);
end;$$;

create function public.begin_addon_deletion(p_addon uuid,p_expected timestamptz,p_name text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare a public.addons; pending private.addon_deletions;
begin
 if not private.is_admin() then raise exception 'ADDON_DELETE_DENIED' using errcode='42501'; end if;
 select * into a from public.addons where id=p_addon for update;
 select * into pending from private.addon_deletions where addon_id=p_addon;
 if pending.addon_id is not null then
  if p_name is distinct from pending.addon_name then raise exception 'ADDON_NAME_REQUIRED' using errcode='22023'; end if;
 elsif a.id is null or a.updated_at is distinct from p_expected then raise exception 'ADDON_DELETE_CONFLICT' using errcode='40001';
 else
  if p_name is distinct from a.name then raise exception 'ADDON_NAME_REQUIRED' using errcode='22023'; end if;
  -- Stop on unexpected object paths rather than deleting unrelated content.
  if exists(select 1 from storage.objects o where o.bucket_id in ('addon-files','addon-images') and o.name like p_addon::text||'/%' and
   not case when split_part(split_part(o.name,'/',2),'.',1) ~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
    then private.asset_path_valid(p_addon,split_part(split_part(o.name,'/',2),'.',1)::uuid,o.name,o.bucket_id) else false end)
  then raise exception 'ADDON_UNEXPECTED_OBJECT' using errcode='22023'; end if;
  perform set_config('wfa.editorial_note','Eliminación definitiva confirmada por nombre desde gestión.',true);
  update public.addons set status='draft',published_at=null,distribution_approved=false where id=p_addon;
  update public.addon_releases set status='draft',published_at=null where addon_id=p_addon;
  update public.addon_images set is_published=false where addon_id=p_addon;
  insert into private.retired_assets(bucket,path) select bucket_id,name from storage.objects where bucket_id in ('addon-files','addon-images') and name like p_addon::text||'/%' on conflict do nothing;
  delete from public.addon_releases where addon_id=p_addon;
  delete from public.addon_images where addon_id=p_addon;
  insert into private.addon_deletions(addon_id,addon_name) values(p_addon,a.name);
 end if;
 return jsonb_build_object('deleted',a.id is null,'files',coalesce((select jsonb_agg(jsonb_build_object('bucket',o.bucket_id,'path',o.name)) from storage.objects o where o.bucket_id in ('addon-files','addon-images') and o.name like p_addon::text||'/%'),'[]'::jsonb));
end;$$;

create function public.finish_addon_deletion(p_addon uuid,p_name text) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if not private.is_admin() then raise exception 'ADDON_DELETE_DENIED' using errcode='42501'; end if;
 perform 1 from public.addons where id=p_addon for update;
 if not exists(select 1 from private.addon_deletions where addon_id=p_addon and addon_name=p_name) then raise exception 'ADDON_NAME_REQUIRED' using errcode='22023'; end if;
 if exists(select 1 from storage.objects where bucket_id in ('addon-files','addon-images') and name like p_addon::text||'/%') then raise exception 'ADDON_CLEANUP_PENDING' using errcode='40001'; end if;
 if exists(select 1 from public.addon_releases where addon_id=p_addon) or exists(select 1 from public.addon_images where addon_id=p_addon) then raise exception 'ADDON_DELETE_CONFLICT' using errcode='40001'; end if;
 perform set_config('wfa.editorial_note','Eliminación definitiva completada tras comprobar Storage vacío.',true);
 delete from public.addons where id=p_addon;
 return true;
end;$$;
revoke all on function public.addon_deletion_pending(),public.begin_addon_deletion(uuid,timestamptz,text),public.finish_addon_deletion(uuid,text) from public,anon;
grant execute on function public.addon_deletion_pending(),public.begin_addon_deletion(uuid,timestamptz,text),public.finish_addon_deletion(uuid,text) to authenticated;
commit;
