begin;

-- Both buckets are private so a guessed draft URL cannot bypass publication rules.
-- Free means no purchase/login required, not unrestricted access to draft files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('addon-files', 'addon-files', false, 104857600, array['application/zip', 'application/x-zip-compressed']),
  ('addon-images', 'addon-images', false, 5242880, array['image/png', 'image/jpeg', 'image/webp']);

create policy published_addon_files on storage.objects for select to anon, authenticated
using (
  bucket_id = 'addon-files'
  and exists (
    select 1 from public.addon_releases r
      join public.addons a on a.id = r.addon_id
      join public.categories c on c.id = a.category_id
    where r.file_path = storage.objects.name
      and r.status = 'published' and r.published_at <= now()
      and a.status = 'published' and a.published_at <= now() and c.is_visible
  )
);

create policy published_addon_images on storage.objects for select to anon, authenticated
using (
  bucket_id = 'addon-images'
  and exists (
    select 1 from public.addon_images i
      join public.addons a on a.id = i.addon_id
      join public.categories c on c.id = a.category_id
    where i.file_path = storage.objects.name and i.is_published
      and a.status = 'published' and a.published_at <= now() and c.is_visible
  )
);

create policy admin_addon_storage on storage.objects for all to authenticated
using (bucket_id in ('addon-files', 'addon-images') and (select private.is_admin()))
with check (bucket_id in ('addon-files', 'addon-images') and (select private.is_admin()));

commit;
