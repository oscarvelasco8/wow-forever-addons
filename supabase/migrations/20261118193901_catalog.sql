begin;

-- This schema is not exposed in the Supabase Data API.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create table private.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table private.admin_users enable row level security;
revoke all on private.admin_users from public, anon, authenticated;

-- Membership comes from a protected table, never from editable user_metadata.
create function private.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from private.admin_users where user_id = (select auth.uid()));
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

create type public.publication_status as enum ('draft', 'published', 'archived');

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) between 1 and 80),
  is_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.addons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) between 1 and 100),
  category_id uuid not null references public.categories(id) on delete restrict,
  summary text not null check (length(trim(summary)) between 1 and 300),
  description text not null default '' check (length(description) <= 30000),
  author_name text not null check (length(trim(author_name)) between 1 and 150),
  license_name text not null default 'Pending review',
  credits text not null default '',
  status public.publication_status not null default 'draft',
  distribution_approved boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint addon_publication_requires_review check (
    status <> 'published' or (distribution_approved and published_at is not null)
  )
);

create table public.addon_releases (
  id uuid primary key default gen_random_uuid(),
  addon_id uuid not null references public.addons(id) on delete restrict,
  version text not null check (version ~ '^[A-Za-z0-9][A-Za-z0-9.+_-]{0,63}$'),
  game_version text not null check (length(trim(game_version)) between 1 and 40),
  interface_version integer not null check (interface_version > 0),
  changelog text not null default '' check (length(changelog) <= 30000),
  status public.publication_status not null default 'draft',
  file_path text unique,
  file_size_bytes bigint check (file_size_bytes between 1 and 104857600),
  sha256 text check (sha256 ~ '^[a-f0-9]{64}$'),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (addon_id, version),
  constraint release_path_is_canonical check (
    file_path is null or file_path = addon_id::text || '/' || id::text || '.zip'
  ),
  constraint release_publication_requires_file check (
    status <> 'published' or (
      file_path is not null and file_size_bytes is not null
      and sha256 is not null and published_at is not null
    )
  )
);

create table public.addon_images (
  id uuid primary key default gen_random_uuid(),
  addon_id uuid not null references public.addons(id) on delete restrict,
  file_path text not null unique,
  alt_text text not null check (length(trim(alt_text)) between 1 and 300),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint image_path_is_canonical check (
    file_path in (
      addon_id::text || '/' || id::text || '.png',
      addon_id::text || '/' || id::text || '.jpg',
      addon_id::text || '/' || id::text || '.webp'
    )
  )
);

create index addons_category_idx on public.addons(category_id);
create index addons_publication_idx on public.addons(status, published_at);
create index releases_addon_status_idx on public.addon_releases(addon_id, status, published_at);
create index images_addon_order_idx on public.addon_images(addon_id, sort_order);

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function private.touch_updated_at() from public, anon, authenticated;

-- Explicit grants AND RLS; neither layer substitutes for the other.
do $$
declare table_name text;
begin
  foreach table_name in array array['categories', 'addons', 'addon_releases', 'addon_images'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from public, anon, authenticated', table_name);
    execute format('grant select on public.%I to anon, authenticated', table_name);
    execute format('grant insert, update, delete on public.%I to authenticated', table_name);
    execute format('grant all on public.%I to service_role', table_name);
    execute format(
      'create policy admin_access on public.%I for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))',
      table_name
    );
    execute format(
      'create trigger touch_updated_at before update on public.%I for each row execute function private.touch_updated_at()',
      table_name
    );
  end loop;
end;
$$;

create policy public_categories on public.categories for select to anon, authenticated
using (is_visible);

create policy public_addons on public.addons for select to anon, authenticated
using (
  status = 'published' and published_at <= now()
  and exists (select 1 from public.categories c where c.id = category_id and c.is_visible)
);

create policy public_releases on public.addon_releases for select to anon, authenticated
using (
  status = 'published' and published_at <= now()
  and exists (
    select 1 from public.addons a where a.id = addon_id
      and a.status = 'published' and a.published_at <= now()
      and exists (select 1 from public.categories c where c.id = a.category_id and c.is_visible)
  )
);

create policy public_images on public.addon_images for select to anon, authenticated
using (
  is_published and exists (
    select 1 from public.addons a where a.id = addon_id
      and a.status = 'published' and a.published_at <= now()
      and exists (select 1 from public.categories c where c.id = a.category_id and c.is_visible)
  )
);

commit;
