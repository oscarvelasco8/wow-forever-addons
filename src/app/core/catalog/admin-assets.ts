import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from '../supabase/database.types';
import { DraftConflictError, releaseFields, type ReleaseFields, type DraftRelease, type DraftBundle } from './admin-drafts';
import { assetId, AssetValidationError, inspectZip, validateImageFile, ZIP_LIMIT } from './asset-validation';
import { cleanupRetiredAsset, draftAssetStatus } from './asset-changes';

type Client = SupabaseClient<Database>;
export type DraftImage = Tables<'addon_images'>;
async function requireAssetParent(client: Client, addonId: string): Promise<void> {
  const parent = await client.from('addons').select('id').eq('id', addonId).in('status', ['draft','published']).maybeSingle();
  if (parent.error || !parent.data) { throw new DraftConflictError(); }
}
export async function loadAssetBundle(client: Client, addonId: string): Promise<DraftBundle> {
  const [addon,releases,categories]=await Promise.all([
    client.from('addons').select('*').eq('id',addonId).in('status',['draft','published']).single(),
    client.from('addon_releases').select('*').eq('addon_id',addonId).eq('status','draft').order('created_at',{ascending:false}),
    client.from('categories').select('*').order('sort_order').order('name').order('id'),
  ]);
  if(addon.error || releases.error || categories.error){throw new Error('No se pudieron cargar los archivos del addon.');}
  return {addon:addon.data,releases:releases.data,categories:categories.data};
}
async function removeNewObject(client: Client, bucket: string, path: string): Promise<void> {
  const parts=path.split('/');
  try{await cleanupRetiredAsset(client,parts[0]!,parts[1]!.split('.')[0]!,bucket,path);return;}
  catch{throw new Error(`La subida no se completó y la limpieza requiere revisión: ${bucket}/${path}.`);}
}
export async function createDraftRelease(client: Client, addonId: string, fields: ReleaseFields): Promise<DraftRelease> {
  const values = releaseFields(fields); await requireAssetParent(client, addonId);
  const result = await client.from('addon_releases').insert({ addon_id: addonId, ...values, status: 'draft' }).select('*').single();
  if (result.error) { throw new Error('No se creó la versión. Comprueba que no exista otra con ese número y que tu sesión siga activa.'); }
  return result.data;
}
export async function uploadDraftZip(client: Client, addonId: string, id: string, updatedAt: string, file: File): Promise<DraftRelease> {
  if (file.size > ZIP_LIMIT) { throw new AssetValidationError('El ZIP supera 50 MiB.'); }
  const content = new Uint8Array(await file.arrayBuffer());
  const info = inspectZip(content, file.name); await requireAssetParent(client, addonId);
  if(!(await draftAssetStatus(client,addonId)).ready)throw new Error('La gestión segura de archivos está pendiente de habilitar. No se ha subido ningún archivo.');
  const release = await client.from('addon_releases').select('*').eq('id', id).eq('addon_id', addonId).eq('status', 'draft').eq('updated_at', updatedAt).maybeSingle();
  if (release.error || !release.data || release.data.file_path) { throw new DraftConflictError(); }
  const path = `${addonId}/${id}/${assetId()}.zip`;
  const uploaded = await client.storage.from('addon-files').upload(path, file, { contentType: 'application/zip', upsert: false, cacheControl: '0' });
  if (uploaded.error) { throw new Error('No se subió el ZIP. Comprueba tu conexión y sesión; no se ha reemplazado ningún archivo.'); }
  try {
    const saved = await client.from('addon_releases').update({ file_path: path, file_size_bytes: info.size, sha256: info.sha256 })
      .eq('id', id).eq('addon_id', addonId).eq('status', 'draft').eq('updated_at', updatedAt).is('file_path', null).select('*').maybeSingle();
    if (!saved.error && saved.data) { return saved.data; }
  } catch { /* Reconcile a response lost after the database committed. */ }
  const current = await client.from('addon_releases').select('*').eq('id', id).eq('addon_id', addonId).maybeSingle();
  if (current.error) { throw new Error(`No se pudo confirmar el guardado. Conservado para revisión: addon-files/${path}.`); }
  if (current.data?.file_path === path) {
    if (current.data.status === 'draft' && current.data.sha256 === info.sha256 && current.data.file_size_bytes === info.size) { return current.data; }
    throw new Error(`Otro cambio utiliza el archivo; no se eliminó: addon-files/${path}.`);
  }
  await removeNewObject(client, 'addon-files', path);
  throw new Error('No se pudo asociar el ZIP. Se eliminó la subida nueva; recarga las versiones antes de reintentar.');
}
export async function uploadDraftImage(client: Client, addonId: string, file: File, alt: string, sortOrder: number): Promise<DraftImage> {
  if (!alt.trim() || alt.length > 300 || !Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 2147483647) {
    throw new AssetValidationError('Añade un texto alternativo de hasta 300 caracteres y un orden entero válido.');
  }
  const type = await validateImageFile(file); await requireAssetParent(client, addonId);
  if(!(await draftAssetStatus(client,addonId)).ready)throw new Error('La gestión segura de archivos está pendiente de habilitar. No se ha subido ningún archivo.');
  const id = assetId(), path = `${addonId}/${id}.${type.extension}`;
  const uploaded = await client.storage.from('addon-images').upload(path, file, { contentType: type.mime, upsert: false, cacheControl: '0' });
  if (uploaded.error) { throw new Error('No se subió la imagen. Comprueba tu conexión y sesión.'); }
  try {
    const saved = await client.from('addon_images').insert({ id, addon_id: addonId, file_path: path, alt_text: alt.trim(), sort_order: sortOrder, is_published: false }).select('*').single();
    if (!saved.error && saved.data) { return saved.data; }
  } catch { /* Reconcile before cleaning up a possibly committed insert. */ }
  const current = await client.from('addon_images').select('*').eq('id', id).eq('addon_id', addonId).maybeSingle();
  if (current.error) { throw new Error(`No se pudo confirmar el guardado. Conservada para revisión: addon-images/${path}.`); }
  if (current.data?.file_path === path) { return current.data; }
  await removeNewObject(client, 'addon-images', path);
  throw new Error('No se pudo asociar la imagen. Se eliminó la subida nueva; puedes reintentar.');
}
export async function loadDraftImages(client: Client, addonId: string): Promise<DraftImage[]> {
  await requireAssetParent(client, addonId);
  const result = await client.from('addon_images').select('*').eq('addon_id', addonId).order('sort_order').order('created_at');
  if (result.error) { throw new Error('No se pudieron cargar las imágenes.'); }
  return result.data;
}
export async function draftImageBlob(client: Client, addonId: string, id: string): Promise<Blob> {
  await requireAssetParent(client, addonId);
  const row = await client.from('addon_images').select('file_path').eq('id', id).eq('addon_id', addonId).single();
  if (row.error) { throw new Error('Imagen no disponible.'); }
  const result = await client.storage.from('addon-images').download(row.data.file_path);
  if (result.error) { throw new Error('No se pudo cargar la vista previa.'); }
  return result.data;
}
