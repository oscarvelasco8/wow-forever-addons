import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/database.types';
import type { DraftAddon } from './admin-drafts';
import { DraftConflictError } from './admin-drafts';
import { announceCatalogChange } from './catalog-updates';

type Client = SupabaseClient<Database>;
export async function loadDeletionStatus(
  client: Client,
): Promise<{ ready: boolean; pending: string[] }> {
  const result = await client.rpc('addon_deletion_pending');
  return {
    ready: !result.error && Array.isArray(result.data),
    pending: Array.isArray(result.data)
      ? result.data.filter((id): id is string => typeof id === 'string')
      : [],
  };
}
export async function deleteAddon(
  client: Client,
  addon: Pick<DraftAddon, 'id' | 'name' | 'updated_at'>,
  name: string,
): Promise<void> {
  if (name !== addon.name)
    throw new Error('Escribe el nombre completo del addon para confirmar la eliminación.');
  try {
    const start = await client.rpc('begin_addon_deletion', {
      p_addon: addon.id,
      p_expected: addon.updated_at,
      p_name: name,
    });
    if (start.error?.code === '40001') throw new DraftConflictError();
    if (start.error)
      throw new Error(
        'No se pudo preparar la eliminación. Comprueba tu sesión y recarga el listado.',
      );
    const data = start.data as { files?: { bucket: string; path: string }[] } | null;
    if (
      !data ||
      !Array.isArray(data.files) ||
      data.files.some(
        (f) =>
          !['addon-files', 'addon-images'].includes(f.bucket) ||
          typeof f.path !== 'string' ||
          !f.path.startsWith(addon.id + '/'),
      )
    )
      throw new Error('No se pudo validar la limpieza. Recarga el listado antes de continuar.');
    for (const bucket of ['addon-files', 'addon-images']) {
      const paths = data.files.filter((f) => f.bucket === bucket).map((f) => f.path);
      for (let offset = 0; offset < paths.length; offset += 100) {
        const removed = await client.storage.from(bucket).remove(paths.slice(offset, offset + 100));
        if (removed.error)
          throw new Error(
            'El addon está oculto, pero quedan archivos por limpiar. Pulsa «Continuar eliminación» para reanudar.',
          );
      }
    }
    const finish = await client.rpc('finish_addon_deletion', { p_addon: addon.id, p_name: name });
    if (finish.error || finish.data !== true)
      throw new Error(
        'No se confirmó la limpieza completa. Recarga el listado y continúa la eliminación si sigue pendiente.',
      );
    const row = await client.from('addons').select('id').eq('id', addon.id).maybeSingle();
    if (row.error || row.data)
      throw new Error(
        'No se pudo comprobar la eliminación final. Actualiza el listado antes de repetir.',
      );
  } finally {
    announceCatalogChange();
  }
}
