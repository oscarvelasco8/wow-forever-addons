import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from '../supabase/database.types';
import { DraftConflictError } from './admin-drafts';
export type Category = Tables<'categories'>;
export interface CategoryInput {
  id?: string;
  expected?: string;
  name: string;
  slug: string;
  order: number;
  visible: boolean;
}
export interface CategoryBundle {
  categories: Category[];
  events: Tables<'editorial_events'>[];
}
export function categoryFields(input: CategoryInput): CategoryInput {
  if (
    !input.name.trim() ||
    input.name.trim().length > 80 ||
    input.slug.length > 100 ||
    !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(input.slug) ||
    !Number.isInteger(input.order) ||
    input.order < 0 ||
    input.order > 2147483647 ||
    typeof input.visible !== 'boolean' ||
    (!input.id && input.visible)
  ) {
    throw new Error(
      'Revisa el nombre, identificador y orden. Las categorías nuevas se crean ocultas.',
    );
  }
  return {
    id: input.id,
    expected: input.expected,
    name: input.name.trim(),
    slug: input.slug,
    order: input.order,
    visible: input.visible,
  };
}
export async function loadCategories(client: SupabaseClient<Database>): Promise<CategoryBundle> {
  const [categories, events] = await Promise.all([
    client.from('categories').select('*').order('sort_order').order('name').order('id'),
    client
      .from('editorial_events')
      .select('*')
      .eq('entity', 'categories')
      .order('occurred_at', { ascending: false })
      .order('id')
      .limit(100),
  ]);
  if (categories.error || events.error) {
    throw new Error('No se pudieron cargar las categorías y su historial.');
  }
  return { categories: categories.data, events: events.data };
}
export async function saveCategory(
  client: SupabaseClient<Database>,
  input: CategoryInput,
  note: string,
): Promise<void> {
  const fields = categoryFields(input);
  if (note.trim().length < 12 || note.length > 1000) {
    throw new Error('Explica el cambio con entre 12 y 1000 caracteres.');
  }
  const result = await client.rpc('save_category', {
    p_id: fields.id,
    p_expected: fields.expected,
    p_name: fields.name,
    p_slug: fields.slug,
    p_sort: fields.order,
    p_visible: fields.visible,
    p_note: note,
  });
  if (result.error?.code === '40001') {
    throw new DraftConflictError();
  }
  if (result.error?.code === '23505') {
    throw new Error('Ese identificador ya existe. Recarga las categorías y elige otro.');
  }
  if (result.error) {
    throw new Error(
      'No se pudo confirmar el cambio. Recarga y revisa el historial antes de volver a guardar.',
    );
  }
}
