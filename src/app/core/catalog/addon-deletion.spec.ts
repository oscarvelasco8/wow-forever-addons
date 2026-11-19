import { createClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/database.types';
import { deleteAddon } from './addon-deletion';
const addon = { id: '11111111-1111-4111-8111-111111111111', name: 'Prueba', updated_at: 'stamp' };
function client(fetcher: typeof fetch) {
  return createClient<Database>('https://example.supabase.co', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetcher },
  });
}
describe('Permanent addon deletion with installed SDK', () => {
  it('requires exact name before any request', async () => {
    const transport = vi.fn();
    await expect(deleteAddon(client(transport), addon, 'Otro')).rejects.toThrow('nombre completo');
    expect(transport).not.toHaveBeenCalled();
  });
  it('removes only prepared paths via Storage HTTP before finalizing', async () => {
    const steps: string[] = [];
    const transport = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = new URL(String(input)).pathname;
      if (path.endsWith('/begin_addon_deletion')) {
        steps.push('prepare');
        expect(JSON.parse(String(init?.body)).p_expected).toBe('stamp');
        return Response.json({ files: [{ bucket: 'addon-files', path: addon.id + '/file.zip' }] });
      }
      if (path === '/storage/v1/object/addon-files') {
        steps.push('storage');
        expect(init?.method).toBe('DELETE');
        expect(JSON.parse(String(init?.body)).prefixes).toEqual([addon.id + '/file.zip']);
        return Response.json([]);
      }
      if (path.endsWith('/finish_addon_deletion')) {
        steps.push('finish');
        return Response.json(true);
      }
      if (path.endsWith('/addons')) {
        steps.push('verify');
        return Response.json(null);
      }
      throw Error('Unexpected request');
    });
    await deleteAddon(client(transport), addon, 'Prueba');
    expect(steps).toEqual(['prepare', 'storage', 'finish', 'verify']);
  });
  it('does not finalize or automatically retry when Storage fails', async () => {
    const transport = vi.fn(async (input: RequestInfo | URL) =>
      String(input).includes('/begin_addon_deletion')
        ? Response.json({ files: [{ bucket: 'addon-files', path: addon.id + '/file.zip' }] })
        : Response.json({ message: 'offline' }, { status: 503 }),
    );
    await expect(deleteAddon(client(transport), addon, 'Prueba')).rejects.toThrow(
      'Continuar eliminación',
    );
    expect(transport.mock.calls.some((c) => String(c[0]).includes('finish_addon_deletion'))).toBe(
      false,
    );
  });
  it('rejects foreign paths returned by an unexpected response', async () => {
    const transport = vi.fn(async () =>
      Response.json({ files: [{ bucket: 'addon-files', path: 'another-addon/file.zip' }] }),
    );
    await expect(deleteAddon(client(transport), addon, 'Prueba')).rejects.toThrow('validar');
    expect(transport).toHaveBeenCalledOnce();
  });
});
