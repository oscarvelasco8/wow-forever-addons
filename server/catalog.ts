import type { PublicAddon } from '../src/app/core/catalog/public-catalog.types.ts';
import type { SupabasePublicConfig } from './config/supabase.ts';

export async function readPublicCatalog(
  config: SupabasePublicConfig,
  fetcher: typeof fetch = fetch,
  slug?: string,
): Promise<PublicAddon[]> {
  if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    throw new Error('A valid addon slug is required.');
  }
  const query = new URLSearchParams({
    select:
      'slug,name,summary,description,installation_instructions,author_name,license_name,credits,status,distribution_approved,published_at,categories!inner(name,slug,sort_order,is_visible),addon_releases(id,version,game_version,interface_version,changelog,published_at,status),addon_images(id,alt_text,sort_order,is_published)',
    status: 'eq.published',
    distribution_approved: 'eq.true',
    published_at: `lte.${new Date().toISOString()}`,
    'categories.is_visible': 'eq.true',
    'addon_releases.status': 'eq.published',
    'addon_releases.published_at': `lte.${new Date().toISOString()}`,
    'addon_releases.order': 'published_at.desc,id.desc',
    order: 'name.asc,slug.asc',
    limit: '1',
    slug: `eq.${slug}`,
    'addon_images.is_published': 'eq.true',
    'addon_images.order': 'sort_order.asc,id.asc',
  });
  // Always anonymous, including when the caller is an administrator. Never forward cookies/JWT.
  const response = await fetcher(`${config.url}/rest/v1/addons?${query}`, {
    headers: { apikey: config.publishableKey },
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    throw new Error('Catalog unavailable.');
  }
  const rows: unknown = await response.json();
  if (!Array.isArray(rows)) {
    throw new Error('Invalid catalog response.');
  }
  return parsePublicAddons(rows);
}
export function parsePublicAddons(rows: unknown, summary = false): PublicAddon[] {
  if (!Array.isArray(rows)) {
    throw new Error('Invalid catalog response.');
  }
  return rows.map((row): PublicAddon => {
    const text = (value: unknown): string => {
      if (typeof value !== 'string') {
        throw new Error('Invalid catalog field.');
      }
      return value;
    };
    const published = (status: unknown, date: unknown) =>
      status === 'published' &&
      typeof date === 'string' &&
      Number.isFinite(Date.parse(date)) &&
      Date.parse(date) <= Date.now();
    if (
      !row ||
      !published(row.status, row.published_at) ||
      !row.distribution_approved ||
      !row.categories?.is_visible ||
      !Number.isInteger(row.categories.sort_order) ||
      row.categories.sort_order < 0 ||
      typeof row.categories.slug !== 'string' ||
      !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(row.categories.slug) ||
      !Array.isArray(row.addon_releases) ||
      !Array.isArray(row.addon_images) ||
      !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(row.slug)
    ) {
      throw new Error('Invalid catalog publication.');
    }
    return {
      slug: text(row.slug),
      name: text(row.name),
      summary: text(row.summary),
      description: summary ? '' : text(row.description),
      installationInstructions: summary ? '' : text(row.installation_instructions),
      category: text(row.categories.name),
      author: summary ? '' : text(row.author_name),
      license: summary ? '' : text(row.license_name),
      credits: summary ? '' : text(row.credits),
      categorySlug: row.categories.slug,
      categoryOrder: row.categories.sort_order,
      images: row.addon_images.map((image: Record<string, unknown>) => {
        if (
          image['is_published'] !== true ||
          typeof image['id'] !== 'string' ||
          !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(image['id']) ||
          typeof image['alt_text'] !== 'string' ||
          !image['alt_text'].trim() ||
          image['alt_text'].length > 300 ||
          !Number.isInteger(image['sort_order']) ||
          (image['sort_order'] as number) < 0
        ) {
          throw new Error('Invalid image publication.');
        }
        return { id: image['id'], altText: image['alt_text'] };
      }),
      releases: row.addon_releases.map((release: Record<string, unknown>) => {
        if (
          !published(release['status'], release['published_at']) ||
          !Number.isInteger(release['interface_version'])
        ) {
          throw new Error('Invalid release publication.');
        }
        return {
          id: text(release['id']),
          version: text(release['version']),
          gameVersion: text(release['game_version']),
          interfaceVersion: release['interface_version'] as number,
          changelog: summary ? '' : text(release['changelog']),
          publishedAt: text(release['published_at']),
        };
      }),
    };
  });
}
