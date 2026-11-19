-- Read-only checks to run after applying migrations to a development project.
-- Expected: 6 rows with RLS true, 2 private buckets, and no grants on admin_users.
select n.nspname as schema_name, c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where (n.nspname = 'public' and c.relname in ('categories','addons','addon_releases','addon_images','editorial_events'))
   or (n.nspname = 'private' and c.relname = 'admin_users')
order by n.nspname, c.relname;

select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id in ('addon-files', 'addon-images') order by id;

select grantee, privilege_type
from information_schema.table_privileges
where table_schema = 'private' and table_name = 'admin_users'
  and grantee in ('anon', 'authenticated', 'PUBLIC');

select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public' and tablename in ('categories','addons','addon_releases','addon_images','editorial_events')
   or schemaname = 'storage' and policyname in ('published_addon_files','published_addon_images','admin_addon_storage')
order by schemaname, tablename, policyname;
