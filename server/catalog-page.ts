import type { SupabasePublicConfig } from './config/supabase.ts';
import { parsePublicAddons } from './catalog.ts';
export const PAGE_SIZE = 12;
export interface CatalogCriteria {
  query: string;
  category: string;
  cursor?: string;
}
export class InvalidCatalogQuery extends Error {}
export function catalogCriteria(url: URL): CatalogCriteria {
  const query = (url.searchParams.get('q') ?? '').trim(),
    category = url.searchParams.get('category') ?? '',
    cursor = url.searchParams.get('cursor') ?? undefined;
  if (
    query.length > 160 ||
    category.length > 100 ||
    (category && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(category)) ||
    (cursor && cursor.length > 4096)
  ) {
    throw new InvalidCatalogQuery();
  }
  return { query, category, cursor };
}
export async function readCatalogPage(
  config: SupabasePublicConfig,
  criteria: CatalogCriteria,
  fetcher: typeof fetch = fetch,
) {
  let cursor: { name: string; slug: string } | null = null;
  if (criteria.cursor) {
    try {
      const c = JSON.parse(Buffer.from(criteria.cursor, 'base64url').toString('utf8'));
      if (
        c.q !== criteria.query ||
        c.category !== criteria.category ||
        typeof c.name !== 'string' ||
        c.name.length > 100 ||
        typeof c.slug !== 'string' ||
        c.slug.length > 100 ||
        !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(c.slug)
      ) {
        throw new Error();
      }
      cursor = c;
    } catch {
      throw new InvalidCatalogQuery();
    }
  }
  const query = new URLSearchParams({
    select:
      'slug,name,summary,status,distribution_approved,published_at,categories!inner(name,slug,sort_order,is_visible),addon_releases(id,version,game_version,interface_version,published_at,status),addon_images(id,alt_text,sort_order,is_published)',
    'addon_releases.status': 'eq.published',
    'addon_releases.published_at': `lte.${new Date().toISOString()}`,
    'addon_releases.order': 'published_at.desc,id.desc',
    'addon_releases.limit': '1',
    'addon_images.is_published': 'eq.true',
    'addon_images.order': 'sort_order.asc,id.asc',
    'addon_images.limit': '1',
  });
  const options = {
    headers: { apikey: config.publishableKey },
    cache: 'no-store' as const,
    signal: AbortSignal.timeout(10000),
  };
  const response = await fetcher(`${config.url}/rest/v1/rpc/catalog_page?select=slug,name`, {
    ...options,
    method: 'POST',
    headers: { ...options.headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      p_query: criteria.query,
      p_category: criteria.category,
      p_after_name: cursor?.name ?? null,
      p_after_slug: cursor?.slug ?? null,
      p_limit: PAGE_SIZE + 1,
    }),
  });
  if (!response.ok) {
    throw new Error('Catalog unavailable.');
  }
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length > PAGE_SIZE + 1) {
    throw new Error('Invalid catalog page.');
  }
  for (const row of rows) {
    if (
      typeof row.name !== 'string' ||
      row.name.length > 100 ||
      typeof row.slug !== 'string' ||
      !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(row.slug)
    ) {
      throw new Error('Invalid catalog cursor.');
    }
  }
  const selected = rows.slice(0, PAGE_SIZE),
    last = selected.at(-1);
  const nextCursor =
    rows.length > PAGE_SIZE && last
      ? Buffer.from(
          JSON.stringify({
            name: last.name,
            slug: last.slug,
            q: criteria.query,
            category: criteria.category,
          }),
        ).toString('base64url')
      : null;
  // Keep RPC pagination separate from relationship filters (PostgREST 14 aliases
  // embedded RPC predicates incorrectly). The bounded second read rechecks RLS.
  let addons: ReturnType<typeof parsePublicAddons> = [];
  if (selected.length) {
    query.set('slug', `in.(${selected.map((row) => row.slug).join(',')})`);
    query.set('status', 'eq.published');
    query.set('distribution_approved', 'eq.true');
    query.set('published_at', `lte.${new Date().toISOString()}`);
    query.set('categories.is_visible', 'eq.true');
    query.set('order', 'name.asc,slug.asc');
    query.set('limit', String(PAGE_SIZE));
    const details = await fetcher(`${config.url}/rest/v1/addons?${query}`, options);
    if (!details.ok) {
      throw new Error('Catalog summaries unavailable.');
    }
    addons = parsePublicAddons(await details.json(), true);
    if (
      addons.length > PAGE_SIZE ||
      addons.some((addon) => !selected.some((row) => row.slug === addon.slug))
    ) {
      throw new Error('Invalid catalog summaries.');
    }
  }
  const categories: { slug: string; name: string; order: number }[] = [];
  for (let offset = 0; offset < 5000; offset += 100) {
    const q = new URLSearchParams({
      select: 'slug,name,sort_order,addons!inner(id)',
      is_visible: 'eq.true',
      'addons.status': 'eq.published',
      'addons.distribution_approved': 'eq.true',
      'addons.published_at': `lte.${new Date().toISOString()}`,
      'addons.limit': '1',
      order: 'sort_order.asc,name.asc,slug.asc',
      limit: '100',
      offset: String(offset),
    });
    const result = await fetcher(`${config.url}/rest/v1/categories?${q}`, options);
    if (!result.ok) {
      throw new Error('Categories unavailable.');
    }
    const items = await result.json();
    if (!Array.isArray(items)) {
      throw new Error('Invalid categories.');
    }
    for (const item of items) {
      if (
        typeof item.name !== 'string' ||
        typeof item.slug !== 'string' ||
        !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(item.slug) ||
        !Number.isInteger(item.sort_order) ||
        item.sort_order < 0
      ) {
        throw new Error('Invalid category.');
      }
      categories.push({ slug: item.slug, name: item.name, order: item.sort_order });
    }
    if (items.length < 100) {
      return { addons, categories, nextCursor };
    }
  }
  throw new Error('Category pagination limit exceeded.');
}
export async function readPublishedSlugs(
  config: SupabasePublicConfig,
  fetcher: typeof fetch = fetch,
): Promise<string[]> {
  const slugs: string[] = [];
  let after = '';
  const signal = AbortSignal.timeout(20000);
  while (slugs.length <= 49997) {
    const q = new URLSearchParams({
      select: 'slug,categories!inner(is_visible)',
      status: 'eq.published',
      distribution_approved: 'eq.true',
      published_at: `lte.${new Date().toISOString()}`,
      'categories.is_visible': 'eq.true',
      order: 'slug.asc',
      limit: '200',
    });
    if (after) {
      q.set('slug', `gt.${after}`);
    }
    const r = await fetcher(`${config.url}/rest/v1/addons?${q}`, {
      headers: { apikey: config.publishableKey },
      cache: 'no-store',
      signal,
    });
    if (!r.ok) {
      throw new Error('Sitemap unavailable.');
    }
    const rows = await r.json();
    if (!Array.isArray(rows)) {
      throw new Error('Invalid sitemap.');
    }
    for (const row of rows) {
      if (
        typeof row.slug !== 'string' ||
        !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(row.slug) ||
        row.slug <= after ||
        row.categories?.is_visible !== true
      ) {
        throw new Error('Invalid sitemap entry.');
      }
      after = row.slug;
      slugs.push(row.slug);
    }
    if (rows.length < 200 && slugs.length <= 49997) {
      return slugs;
    }
  }
  throw new Error('Sitemap index required.');
}
