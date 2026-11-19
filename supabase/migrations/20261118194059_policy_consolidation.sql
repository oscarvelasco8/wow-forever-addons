begin;

-- Make the intentional lack of client access explicit, even if future grants change.
create policy deny_client_access on private.admin_users as restrictive
for all to anon, authenticated using (false) with check (false);

-- One SELECT policy per role/table avoids repeated permissive-policy evaluation.
do $$
declare table_name text;
begin
  foreach table_name in array array['categories', 'addons', 'addon_releases', 'addon_images'] loop
    execute format('drop policy admin_access on public.%I', table_name);
    execute format('create policy admin_insert on public.%I for insert to authenticated with check ((select private.is_admin()))', table_name);
    execute format('create policy admin_update on public.%I for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))', table_name);
    execute format('create policy admin_delete on public.%I for delete to authenticated using ((select private.is_admin()))', table_name);
  end loop;
end;
$$;

alter policy public_categories on public.categories
using (is_visible or (select private.is_admin()));

alter policy public_addons on public.addons
using (
  (select private.is_admin()) or (
    status = 'published' and published_at <= now()
    and exists (select 1 from public.categories c where c.id = category_id and c.is_visible)
  )
);

alter policy public_releases on public.addon_releases
using (
  (select private.is_admin()) or (
    status = 'published' and published_at <= now()
    and exists (
      select 1 from public.addons a where a.id = addon_id
        and a.status = 'published' and a.published_at <= now()
        and exists (select 1 from public.categories c where c.id = a.category_id and c.is_visible)
    )
  )
);

alter policy public_images on public.addon_images
using (
  (select private.is_admin()) or (
    is_published and exists (
      select 1 from public.addons a where a.id = addon_id
        and a.status = 'published' and a.published_at <= now()
        and exists (select 1 from public.categories c where c.id = a.category_id and c.is_visible)
    )
  )
);

commit;
