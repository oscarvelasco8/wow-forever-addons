import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from '../supabase/database.types';
import { DraftConflictError } from './admin-drafts';

export type EditorialEntity = 'addon' | 'release' | 'image';
export type EditorialAction = 'approve' | 'revoke' | 'publish' | 'withdraw' | 'draft' | 'edit';
export interface EditorialCommand {
  addonId: string;
  entity: EditorialEntity;
  id: string;
  expected: string;
  action: EditorialAction;
  note: string;
  alt?: string;
  order?: number;
}
export interface EditorialBundle {
  addon: Tables<'addons'>;
  releases: Tables<'addon_releases'>[];
  images: Tables<'addon_images'>[];
  events: Tables<'editorial_events'>[];
  category: Tables<'categories'>;
}
export async function listEditorial(client: SupabaseClient<Database>) {
  const result = await client.from('addons').select('*').order('name');
  if (result.error) {
    throw new Error('No se pudo cargar la colección.');
  }
  return result.data;
}
export async function loadEditorial(
  client: SupabaseClient<Database>,
  id: string,
): Promise<EditorialBundle> {
  const [addon, releases, images, events] = await Promise.all([
    client.from('addons').select('*').eq('id', id).single(),
    client
      .from('addon_releases')
      .select('*')
      .eq('addon_id', id)
      .order('created_at', { ascending: false }),
    client
      .from('addon_images')
      .select('*')
      .eq('addon_id', id)
      .order('sort_order')
      .order('created_at'),
    client
      .from('editorial_events')
      .select('*')
      .eq('addon_id', id)
      .order('occurred_at', { ascending: false })
      .order('id')
      .limit(100),
  ]);
  if (addon.error || releases.error || images.error || events.error) {
    throw new Error('No se pudo cargar la revisión editorial. Comprueba tu sesión y recarga.');
  }
  const category = await client
    .from('categories')
    .select('*')
    .eq('id', addon.data.category_id)
    .single();
  if (category.error) {
    throw new Error('No se pudo comprobar la categoría.');
  }
  return {
    addon: addon.data,
    releases: releases.data,
    images: images.data,
    events: events.data,
    category: category.data,
  };
}
export async function editorialAction(
  client: SupabaseClient<Database>,
  command: EditorialCommand,
): Promise<void> {
  if (command.note.trim().length < 12 || command.note.length > 1000) {
    throw new Error('Explica el motivo con entre 12 y 1000 caracteres.');
  }
  const result = await client.rpc('editorial_action', {
    p_addon_id: command.addonId,
    p_entity: command.entity,
    p_id: command.id,
    p_expected: command.expected,
    p_action: command.action,
    p_note: command.note,
    p_alt: command.alt,
    p_order: command.order,
  });
  if (result.error?.code === '40001') {
    throw new DraftConflictError();
  }
  if (result.error) {
    const messages: Record<string, string> = {
      EDITORIAL_LICENSE_REQUIRED: 'Completa la licencia antes de aprobar la distribución.',
      EDITORIAL_CATEGORY_HIDDEN: 'La categoría está oculta. Revísala antes de publicar el addon.',
      EDITORIAL_RELEASE_REQUIRED:
        'Prepara al menos una versión publicada antes de publicar la ficha.',
      EDITORIAL_FILE_REQUIRED: 'Falta el archivo real o sus metadatos válidos. Revisa las subidas.',
      EDITORIAL_TRANSITION_INVALID:
        'La operación no corresponde al estado actual. Comprueba la aprobación y recarga.',
      EDITORIAL_IMAGE_FIELDS: 'Revisa el texto alternativo y el orden de la imagen.',
    };
    throw new Error(
      messages[result.error.message] ??
        'No se pudo confirmar el cambio. Recarga y comprueba el historial antes de reintentar.',
    );
  }
}
export async function editorialImageBlob(
  client: SupabaseClient<Database>,
  addonId: string,
  id: string,
): Promise<Blob> {
  const row = await client
    .from('addon_images')
    .select('file_path')
    .eq('addon_id', addonId)
    .eq('id', id)
    .single();
  if (row.error) {
    throw new Error('Imagen no disponible.');
  }
  const result = await client.storage.from('addon-images').download(row.data.file_path);
  if (result.error) {
    throw new Error('No se pudo cargar la vista previa.');
  }
  return result.data;
}
