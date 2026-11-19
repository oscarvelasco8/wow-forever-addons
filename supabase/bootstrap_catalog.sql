-- Idempotent initial development content, using generated IDs and relational lookups.
-- No publication approval, users, admin membership or invented downloadable files.
begin;

insert into public.categories(slug, name, is_visible)
values ('navegacion', 'Navegación', true)
on conflict (slug) do nothing;

insert into public.addons(slug, name, category_id, summary, description, author_name, license_name, credits)
select 'rumbo', 'Rumbo', id, 'Rutas y navegación para WoW Forever.',
  'Combina vuelos, barcos, zepelines, piedra de hogar y tramos a pie.',
  'Juan', 'Pending review', 'Datos de OpenMap (MIT). Integración opcional con Questie.'
from public.categories where slug='navegacion'
on conflict (slug) do nothing;

insert into public.addon_releases(addon_id, version, game_version, interface_version, changelog)
select id, '0.3.0', '1.60.1', 16001,
  'Referencia del repositorio; pendiente de validación y empaquetado.'
from public.addons where slug='rumbo'
on conflict (addon_id, version) do nothing;

commit;
