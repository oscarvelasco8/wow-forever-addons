import { createClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/database.types';
import { editorialAction, type EditorialCommand } from './admin-editorial';
import { DraftConflictError } from './admin-drafts';

const command: EditorialCommand = {
  addonId: 'a',
  entity: 'release',
  id: 'r',
  expected: '2026-11-19T00:00:00Z',
  action: 'withdraw',
  note: 'Retirada por revisión editorial',
};
describe('Editorial RPC with installed SDK', () => {
  function client(transport: typeof fetch) {
    return createClient<Database>('https://example.supabase.co', 'test-key', {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: transport },
    });
  }
  it('sends one atomic RPC with the reviewed target and original timestamp', async () => {
    const transport = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(new URL(String(input)).pathname).toBe('/rest/v1/rpc/editorial_action');
      expect(init?.method).toBe('POST');
      expect(JSON.parse(String(init?.body))).toEqual({
        p_addon_id: 'a',
        p_entity: 'release',
        p_id: 'r',
        p_expected: command.expected,
        p_action: 'withdraw',
        p_note: command.note,
      });
      return Response.json({ id: 'r', status: 'archived' });
    });
    await editorialAction(client(transport), command);
    expect(transport).toHaveBeenCalledOnce();
  });
  it('distinguishes concurrency and file validation failures without displaying provider diagnostics', async () => {
    await expect(
      editorialAction(
        client(async () => Response.json({ code: '40001', message: 'private' }, { status: 409 })),
        command,
      ),
    ).rejects.toBeInstanceOf(DraftConflictError);
    await expect(
      editorialAction(
        client(async () =>
          Response.json({ code: '22023', message: 'EDITORIAL_FILE_REQUIRED' }, { status: 400 }),
        ),
        command,
      ),
    ).rejects.toThrow('Falta el archivo real');
    await expect(
      editorialAction(
        client(async () => Response.json({ code: '42501', message: 'private' }, { status: 403 })),
        command,
      ),
    ).rejects.toThrow('Recarga');
  });
});
