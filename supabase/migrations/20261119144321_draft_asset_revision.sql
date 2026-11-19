begin;
-- Immutable draft revisions and protected Storage cleanup.
create table private.retired_assets(bucket text not null check(bucket in ('addon-files','addon-images')),path text not null,retired_at timestamptz not null default now(),primary key(bucket,path));
alter table private.retired_assets enable row level security;
revoke all on private.retired_assets from public,anon,authenticated;
grant select,insert on private.retired_assets to authenticated;
create policy admin_read on private.retired_assets for select to authenticated using((select private.is_admin()));
create policy admin_insert on private.retired_assets for insert to authenticated with check((select private.is_admin()));

create function private.asset_path_valid(a uuid,i uuid,p text,b text) returns boolean language sql immutable security invoker set search_path='' as $$
 select p is not null and ((b='addon-files' and (p=a::text||'/'||i::text||'.zip' or p ~ ('^'||a::text||'/'||i::text||'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.zip$'))) or
  (b='addon-images' and (p ~ ('^'||a::text||'/'||i::text||'\.(png|jpg|webp)$') or p ~ ('^'||a::text||'/'||i::text||'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$'))));
$$;
revoke all on function private.asset_path_valid(uuid,uuid,text,text) from public;
grant execute on function private.asset_path_valid(uuid,uuid,text,text) to authenticated;
alter table public.addon_releases drop constraint release_path_is_canonical;
alter table public.addon_releases add constraint release_path_is_canonical check(file_path is null or private.asset_path_valid(addon_id,id,file_path,'addon-files'));
alter table public.addon_images drop constraint image_path_is_canonical;
alter table public.addon_images add constraint image_path_is_canonical check(private.asset_path_valid(addon_id,id,file_path,'addon-images'));

create function private.guard_asset_revision() returns trigger language plpgsql security invoker set search_path='' as $$
declare b text; old_path text; new_path text;
begin
 b:=case when tg_table_name='addon_releases' then 'addon-files' else 'addon-images' end;
 -- Serialize attachment and retirement through the same parent lock.
 perform 1 from public.addons where id=coalesce(new.addon_id,old.addon_id) for update;
 if tg_op<>'INSERT' then old_path:=old.file_path; end if;
 if tg_op<>'DELETE' then new_path:=new.file_path; end if;
 if tg_op<>'INSERT' and (tg_op='DELETE' or old_path is distinct from new_path) then
   if (tg_table_name='addon_releases' and (to_jsonb(old)->>'status'<>'draft' or to_jsonb(old)->>'published_at' is not null)) or
      (tg_table_name='addon_images' and (to_jsonb(old)->>'is_published')::boolean) then raise exception 'ASSET_PUBLISHED_PROTECTED' using errcode='42501'; end if;
   if old_path is not null then insert into private.retired_assets(bucket,path) values(b,old_path) on conflict do nothing; end if;
 end if;
 if new_path is not null and (tg_op='INSERT' or old_path is distinct from new_path) and exists(select 1 from private.retired_assets where bucket=b and path=new_path) then
   raise exception 'ASSET_PATH_RETIRED' using errcode='40001';
 end if;
 return coalesce(new,old);
end;
$$;
revoke all on function private.guard_asset_revision() from public;
create trigger guard_asset_revision before insert or update or delete on public.addon_releases for each row execute function private.guard_asset_revision();
create trigger guard_asset_revision before insert or update or delete on public.addon_images for each row execute function private.guard_asset_revision();

-- Restrictive policies supplement the existing admin policy and cannot be OR-bypassed.
create policy protect_referenced_storage_update on storage.objects as restrictive for update to authenticated
using(not exists(select 1 from public.addon_releases where file_path=storage.objects.name and bucket_id='addon-files') and not exists(select 1 from public.addon_images where file_path=storage.objects.name and bucket_id='addon-images') and not exists(select 1 from private.retired_assets where bucket=bucket_id and path=storage.objects.name))
with check(not exists(select 1 from private.retired_assets where bucket=bucket_id and path=storage.objects.name) and not exists(select 1 from public.addon_releases where file_path=storage.objects.name and bucket_id='addon-files') and not exists(select 1 from public.addon_images where file_path=storage.objects.name and bucket_id='addon-images'));
create policy protect_referenced_storage_delete on storage.objects as restrictive for delete to authenticated
using((exists(select 1 from private.retired_assets where bucket=bucket_id and path=storage.objects.name) or storage.objects.name ~ '^_verification/[0-9a-f]{32}/(probe\.(png|zip)|invalid\.txt|oversized\.(png|zip))$') and not exists(select 1 from public.addon_releases where file_path=storage.objects.name and bucket_id='addon-files') and not exists(select 1 from public.addon_images where file_path=storage.objects.name and bucket_id='addon-images'));
create policy protect_retired_storage_insert on storage.objects as restrictive for insert to authenticated
with check(not exists(select 1 from private.retired_assets where bucket=bucket_id and path=storage.objects.name));

create function public.draft_asset_status(p_addon uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if not private.is_admin() then raise exception 'ASSET_DENIED' using errcode='42501'; end if;
 return jsonb_build_object('ready',true,'pending',coalesce((select jsonb_agg(jsonb_build_object('bucket',r.bucket,'path',r.path,'id',split_part(split_part(r.path,'/',2),'.',1))) from private.retired_assets r where split_part(r.path,'/',1)=p_addon::text and exists(select 1 from storage.objects o where o.bucket_id=r.bucket and o.name=r.path)),'[]'::jsonb));
end;
$$;
revoke all on function public.draft_asset_status(uuid) from public,anon;
grant execute on function public.draft_asset_status(uuid) to authenticated;

create function public.retire_asset_object(p_addon uuid,p_id uuid,p_bucket text,p_path text) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if not private.is_admin() or not private.asset_path_valid(p_addon,p_id,p_path,p_bucket) then raise exception 'ASSET_DENIED' using errcode='42501'; end if;
 perform 1 from public.addons where id=p_addon and status in ('draft','published') for update;
 if not found or exists(select 1 from public.addon_releases where file_path=p_path) or exists(select 1 from public.addon_images where file_path=p_path) then raise exception 'ASSET_REFERENCED' using errcode='40001'; end if;
 insert into private.retired_assets(bucket,path) values(p_bucket,p_path) on conflict do nothing;
 return true;
end;
$$;
create function public.change_draft_asset(p_addon uuid,p_entity text,p_id uuid,p_expected timestamptz,p_path text default null,p_size bigint default null,p_sha text default null,p_note text default '') returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.addon_releases; i public.addon_images; result jsonb;
begin
 if not private.is_admin() then raise exception 'ASSET_DENIED' using errcode='42501'; end if;
 if p_expected is null or p_note is null or length(trim(p_note)) not between 12 and 1000 then raise exception 'ASSET_NOTE_REQUIRED'; end if;
 perform 1 from public.addons where id=p_addon and status in ('draft','published') for update;
 if not found then raise exception 'ASSET_CONFLICT' using errcode='40001'; end if;
 perform set_config('wfa.editorial_note',trim(p_note),true);
 if p_entity='release' then
   select * into r from public.addon_releases where id=p_id and addon_id=p_addon for update;
   if not found or r.updated_at<>p_expected or r.status<>'draft' or r.published_at is not null or r.file_path is null then raise exception 'ASSET_CONFLICT' using errcode='40001'; end if;
   if p_path is not null and (p_path=r.file_path or p_size is null or p_size not between 1 and 52428800 or p_sha is null or p_sha !~ '^[0-9a-f]{64}$' or not exists(select 1 from storage.objects where bucket_id='addon-files' and name=p_path)) then raise exception 'ASSET_FILE_REQUIRED'; end if;
   update public.addon_releases set file_path=p_path,file_size_bytes=case when p_path is null then null else p_size end,sha256=case when p_path is null then null else p_sha end where id=p_id returning to_jsonb(addon_releases.*) into result;
 elsif p_entity='image' then
   select * into i from public.addon_images where id=p_id and addon_id=p_addon for update;
   if not found or i.updated_at<>p_expected or i.is_published then raise exception 'ASSET_CONFLICT' using errcode='40001'; end if;
   if p_path is null then delete from public.addon_images where id=p_id;result:='null'::jsonb;
   else
    if p_path=i.file_path or not exists(select 1 from storage.objects where bucket_id='addon-images' and name=p_path) then raise exception 'ASSET_FILE_REQUIRED'; end if;
    update public.addon_images set file_path=p_path where id=p_id returning to_jsonb(addon_images.*) into result;
   end if;
 else raise exception 'ASSET_ENTITY_INVALID'; end if;
 return result;
end;
$$;
revoke all on function public.change_draft_asset(uuid,text,uuid,timestamptz,text,bigint,text,text),public.retire_asset_object(uuid,uuid,text,text) from public,anon;
grant execute on function public.change_draft_asset(uuid,text,uuid,timestamptz,text,bigint,text,text),public.retire_asset_object(uuid,uuid,text,text) to authenticated;
commit;
