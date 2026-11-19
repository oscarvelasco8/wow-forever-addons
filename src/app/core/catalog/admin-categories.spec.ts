import { createClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/database.types';
import { categoryFields, saveCategory } from './admin-categories';
import { DraftConflictError } from './admin-drafts';
const input = {
  name: 'Exploración',
  slug: 'exploracion',
  order: 2,
  visible: false,
  id: '11111111-1111-4111-8111-111111111111',
  expected: '2026-11-19T00:00:00Z',
};
describe('Category SDK boundary', () => {
  function client(transport: typeof fetch) {
    return createClient<Database>('https://example.supabase.co', 'test-key', {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: transport },
    });
  }
  it('sends only the reviewed fields and original timestamp in one RPC', async () => {
    const transport = vi.fn(async (path: RequestInfo | URL, init?: RequestInit) => {
      expect(new URL(String(path)).pathname).toBe('/rest/v1/rpc/save_category');
      expect(JSON.parse(String(init?.body))).toEqual({
        p_id: input.id,
        p_expected: input.expected,
        p_name: input.name,
        p_slug: input.slug,
        p_sort: 2,
        p_visible: false,
        p_note: 'Motivo del cambio revisado',
      });
      return Response.json({ id: input.id });
    });
    await saveCategory(client(transport), input, 'Motivo del cambio revisado');
    expect(transport).toHaveBeenCalledOnce();
    expect(() => categoryFields({ ...input, id: undefined, visible: true })).toThrow();
  });
  it('distinguishes stale changes and duplicate slugs without exposing diagnostics', async () => {
    await expect(
      saveCategory(
        client(async () => Response.json({ code: '40001', message: 'private' }, { status: 409 })),
        input,
        'Motivo del cambio revisado',
      ),
    ).rejects.toBeInstanceOf(DraftConflictError);
    await expect(
      saveCategory(
        client(async () => Response.json({ code: '23505', message: 'private' }, { status: 409 })),
        input,
        'Motivo del cambio revisado',
      ),
    ).rejects.toThrow('identificador ya existe');
  });
});
