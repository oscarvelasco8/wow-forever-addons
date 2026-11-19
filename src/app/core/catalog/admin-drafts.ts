import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from '../supabase/database.types';

export type DraftAddon = Tables<'addons'>;
export type DraftRelease = Tables<'addon_releases'>;
export type DraftFields = Pick<DraftAddon, 'name' | 'slug' | 'category_id' | 'summary' | 'description' | 'author_name' | 'license_name' | 'credits' | 'installation_instructions'>;
export type ReleaseFields = Pick<DraftRelease, 'version' | 'game_version' | 'interface_version' | 'changelog'>;
export interface DraftBundle { addon: DraftAddon; releases: DraftRelease[]; categories: Tables<'categories'>[]; }
export class DraftConflictError extends Error {}
export class DraftValidationError extends Error {}
export class DraftCreationUncertainError extends Error {}

export async function createDraft(client: SupabaseClient<Database>, id: string, input: DraftFields): Promise<DraftAddon> {
  const fields = draftFields(input);
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) { throw new DraftValidationError(); }
  const result = await client.from('addons').insert({ ...fields, id, status: 'draft', distribution_approved: false, published_at: null }).select('*').single();
  if (!result.error && result.data) { return result.data; }
  if (result.error?.code === '23505') { throw new Error('Esa dirección ya está en uso. Elige otra dirección para la ficha.'); }
  // A lost response can follow a committed insert. Read by the attempt's UUID,
  // never repeat an insert automatically or infer success from a matching slug.
  const saved = await client.from('addons').select('*').eq('id', id).eq('status', 'draft').maybeSingle();
  if (!saved.error && saved.data) { return saved.data; }
  throw new DraftCreationUncertainError();
}

function text(value: string, max: number, required = false): string {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) { throw new DraftValidationError(); }
  return required ? value.trim() : value;
}
export function draftFields(input: DraftFields): DraftFields {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(input.slug) || !/^[0-9a-f-]{36}$/i.test(input.category_id)) { throw new DraftValidationError(); }
  return { name: text(input.name, 100, true), slug: text(input.slug, 100, true), category_id: input.category_id,
    summary: text(input.summary, 300, true), description: text(input.description, 30000),
    author_name: text(input.author_name, 150).trim() || 'Equipo WoW Forever', license_name: text(input.license_name, 150, true),
    credits: text(input.credits, 30000), installation_instructions: text(input.installation_instructions, 30000) };
}
export function releaseFields(input: ReleaseFields): ReleaseFields {
  if (!/^[A-Za-z0-9][A-Za-z0-9.+_-]{0,63}$/.test(input.version) || !Number.isInteger(input.interface_version) || input.interface_version < 1 || input.interface_version > 2147483647) { throw new DraftValidationError(); }
  return { version: input.version, game_version: text(input.game_version, 40, true), interface_version: input.interface_version,
    changelog: text(input.changelog, 30000) };
}

export async function listDrafts(client: SupabaseClient<Database>): Promise<DraftAddon[]> {
  const result = await client.from('addons').select('*').eq('status', 'draft').order('name');
  if (result.error) { throw new Error('No se pudieron cargar los borradores.'); }
  return result.data;
}
export async function loadDraft(client: SupabaseClient<Database>, id: string): Promise<DraftBundle> {
  const [addon, releases, categories] = await Promise.all([
    client.from('addons').select('*').eq('id', id).eq('status', 'draft').single(),
    client.from('addon_releases').select('*').eq('addon_id', id).eq('status', 'draft').order('created_at', { ascending: false }),
    client.from('categories').select('*').order('sort_order').order('name').order('id'),
  ]);
  if (addon.error || releases.error || categories.error) { throw new Error('Borrador no disponible. Comprueba tu sesión y vuelve al listado.'); }
  return { addon: addon.data, releases: releases.data, categories: categories.data };
}
export async function saveDraft(client: SupabaseClient<Database>, id: string, updatedAt: string, input: DraftFields): Promise<DraftAddon> {
  const result = await client.from('addons').update(draftFields(input)).eq('id', id).eq('status', 'draft').eq('updated_at', updatedAt).select('*').maybeSingle();
  if (result.error) { throw new Error('No se guardó el borrador. Comprueba los campos, la dirección única y tu sesión.'); }
  if (!result.data) { throw new DraftConflictError(); }
  return result.data;
}
export async function saveDraftRelease(client: SupabaseClient<Database>, addonId: string, id: string, updatedAt: string, input: ReleaseFields): Promise<DraftRelease> {
  const parent = await client.from('addons').select('id').eq('id', addonId).eq('status', 'draft').maybeSingle();
  if (parent.error || !parent.data) { throw new DraftConflictError(); }
  const result = await client.from('addon_releases').update(releaseFields(input)).eq('id', id).eq('addon_id', addonId).eq('status', 'draft').eq('updated_at', updatedAt).select('*').maybeSingle();
  if (result.error) { throw new Error('No se guardó la versión. Comprueba los campos, el número de versión y tu sesión.'); }
  if (!result.data) { throw new DraftConflictError(); }
  return result.data;
}
