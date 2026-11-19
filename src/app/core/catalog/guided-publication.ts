import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/database.types';
import { editorialAction, loadEditorial } from './admin-editorial';
import { draftFields, saveDraft, DraftConflictError } from './admin-drafts';
import { announceCatalogChange } from './catalog-updates';
import { unzipSync, strFromU8 } from 'fflate';
import { inspectZip } from './asset-validation';

export function zipVersion(
  bytes: Uint8Array,
  name: string,
): { version: string; interfaceVersion: number } | null {
  inspectZip(bytes, name);
  let count = 0;
  const manifests = Object.values(
    unzipSync(bytes, {
      filter: (f) => {
        if (!/\.toc$/i.test(f.name)) return false;
        count++;
        return count === 1 && f.originalSize <= 65536;
      },
    }),
  );
  if (count !== 1 || manifests.length !== 1) return null;
  const text = strFromU8(manifests[0]!);
  const version = text.match(/^##\s*Version:\s*(\S+)/im)?.[1];
  const interfaceVersion = Number(text.match(/^##\s*Interface:\s*(\d+)\s*$/im)?.[1]);
  return version &&
    /^[A-Za-z0-9][A-Za-z0-9.+_-]{0,63}$/.test(version) &&
    Number.isInteger(interfaceVersion) &&
    interfaceVersion > 0 &&
    interfaceVersion <= 2147483647
    ? { version, interfaceVersion }
    : null;
}

/** Existing RLS/MFA RPCs remain authoritative. Publish the parent LAST: partial
 * preparation stays private. A failed step is never retried automatically. */
export async function publishPreparedAddon(
  client: SupabaseClient<Database>,
  id: string,
  releaseId: string,
  expected: string,
  includeImages: boolean,
  permission: boolean,
): Promise<void> {
  if (!permission)
    throw new Error('Confirma que puedes distribuir este contenido antes de publicarlo.');
  let bundle = await loadEditorial(client, id);
  if (bundle.addon.updated_at !== expected) throw new DraftConflictError();
  if (bundle.addon.status !== 'draft')
    throw new Error('La ficha ya no está en borrador. Revisa su estado.');
  if (!bundle.category.is_visible)
    throw new Error('La categoría está oculta. Elige una categoría visible antes de publicar.');
  let release = bundle.releases.find((r) => r.id === releaseId);
  if (
    !release ||
    !['draft', 'published'].includes(release.status) ||
    !release.file_path ||
    !release.sha256 ||
    !release.file_size_bytes
  )
    throw new Error('Añade el ZIP de la versión antes de publicar.');
  const note = 'Publicación guiada: permiso de distribución confirmado por el administrador.';
  const act = async (
    entity: 'addon' | 'release' | 'image',
    target: string,
    stamp: string,
    action: 'approve' | 'publish',
  ) => editorialAction(client, { addonId: id, entity, id: target, expected: stamp, action, note });
  try {
    if (
      ['', 'pending review', 'pendiente', 'pendiente de revisión'].includes(
        bundle.addon.license_name.trim().toLowerCase(),
      )
    ) {
      await saveDraft(client, id, bundle.addon.updated_at, {
        ...draftFields(bundle.addon),
        license_name: 'Distribución autorizada por el titular',
      });
      bundle = await loadEditorial(client, id);
    }
    if (!bundle.addon.distribution_approved) {
      await act('addon', id, bundle.addon.updated_at, 'approve');
      bundle = await loadEditorial(client, id);
    }
    release = bundle.releases.find((r) => r.id === releaseId)!;
    if (release.status === 'draft') await act('release', release.id, release.updated_at, 'publish');
    if (includeImages) {
      for (const image of bundle.images.filter((i) => !i.is_published))
        await act('image', image.id, image.updated_at, 'publish');
    }
    bundle = await loadEditorial(client, id);
    await act('addon', id, bundle.addon.updated_at, 'publish');
  } finally {
    announceCatalogChange();
  }
}
