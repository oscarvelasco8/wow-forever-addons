import type { IncomingMessage, ServerResponse } from 'node:http';
import { readSupabasePublicConfig } from '../server/config/supabase.ts';
import { publicAssetPath } from '../server/asset-path.ts';
import {
  IMAGE_WIDTHS,
  boundedImage,
  optimizeImage,
  type ImageVariant,
} from '../server/image-variants.ts';

const uuid = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
/** Uses only the public key, even when an administrator requests the image. */
export function createImageHandler(fetcher: typeof fetch = fetch) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    const unavailable = (status: number) => {
      response
        .writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
        .end(JSON.stringify({ error: 'image_unavailable' }));
    };
    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      unavailable(405);
      return;
    }
    const url = new URL(request.url ?? '/', 'http://localhost');
    const id = url.searchParams.get('image') ?? '';
    const variant = url.searchParams.get('size');
    if (variant !== null && !Object.hasOwn(IMAGE_WIDTHS, variant)) {
      unavailable(400);
      return;
    }
    if (!uuid.test(id)) {
      unavailable(404);
      return;
    }
    try {
      const config = readSupabasePublicConfig(process.env);
      if (!config) {
        throw new Error('Unavailable configuration.');
      }
      const options = {
        headers: { apikey: config.publishableKey },
        cache: 'no-store' as const,
        signal: AbortSignal.timeout(10000),
      };
      const query = new URLSearchParams({
        select:
          'id,addon_id,file_path,is_published,addons!inner(status,distribution_approved,published_at,categories!inner(is_visible))',
        id: `eq.${id}`,
        limit: '1',
      });
      const metadata = await fetcher(`${config.url}/rest/v1/addon_images?${query}`, options);
      if (!metadata.ok) {
        throw new Error('Unavailable metadata.');
      }
      const rows = await metadata.json();
      const image = Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
      const addon = image?.addons;
      if (
        !image ||
        image.id !== id ||
        image.is_published !== true ||
        !uuid.test(image.addon_id) ||
        !publicAssetPath(image.addon_id,id,image.file_path,'image') ||
        !addon ||
        addon.status !== 'published' ||
        addon.distribution_approved !== true ||
        !addon.categories?.is_visible ||
        typeof addon.published_at !== 'string' ||
        !Number.isFinite(Date.parse(addon.published_at)) ||
        Date.parse(addon.published_at) > Date.now()
      ) {
        unavailable(404);
        return;
      }
      // Storage rechecks anonymous RLS when issuing the short-lived URL.
      const signed = await fetcher(
        `${config.url}/storage/v1/object/sign/addon-images/${image.file_path}`,
        {
          ...options,
          method: 'POST',
          headers: { ...options.headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ expiresIn: 60 }),
          signal: options.signal,
        },
      );
      if (!signed.ok) {
        unavailable(signed.status >= 500 ? 503 : 404);
        return;
      }
      const result = (await signed.json()) as { signedURL?: unknown };
      if (
        typeof result.signedURL !== 'string' ||
        !result.signedURL.startsWith(`/object/sign/addon-images/${image.file_path}?`)
      ) {
        throw new Error('Unexpected signing response.');
      }
      const destination = new URL(`${config.url}/storage/v1${result.signedURL}`);
      if (variant) {
        const source = await fetcher(destination, {
          cache: 'no-store',
          signal: options.signal,
          redirect: 'error',
        });
        if (!source.ok) {
          unavailable(source.status >= 500 ? 503 : 404);
          return;
        }
        const bytes = await optimizeImage(await boundedImage(source), variant as ImageVariant);
        response
          .writeHead(200, { 'Content-Type': 'image/webp', 'Content-Length': String(bytes.length) })
          .end(bytes);
      } else {
        response.writeHead(303, { Location: destination.href }).end();
      }
    } catch {
      unavailable(503);
    }
  };
}
export default createImageHandler();
