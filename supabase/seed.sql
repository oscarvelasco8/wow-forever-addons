-- Development-only metadata; no admin membership, users or invented downloadable files.
insert into public.categories (id, slug, name, is_visible)
values ('10000000-0000-4000-8000-000000000001', 'navegacion', 'Navegación', true)
on conflict (id) do nothing;

insert into public.addons (
  id, slug, name, category_id, summary, description, author_name, license_name, credits
) values (
  '20000000-0000-4000-8000-000000000001', 'rumbo', 'Rumbo',
  '10000000-0000-4000-8000-000000000001',
  'Rutas y navegación para WoW Forever.',
  'Combina vuelos, barcos, zepelines, piedra de hogar y tramos a pie.',
  'Juan', 'Pending review', 'Datos de OpenMap (MIT). Integración opcional con Questie.'
) on conflict (id) do nothing;

insert into public.addon_releases (
  addon_id, version, game_version, interface_version, changelog
)
select id, '0.3.0', '1.60.1', 16001, 'Referencia del repositorio; pendiente de validación y empaquetado.'
from public.addons where slug = 'rumbo'
on conflict (addon_id, version) do nothing;
