import { createClient } from '@supabase/supabase-js';
import { zipSync, strToU8 } from 'fflate';
import { uploadDraftZip } from './admin-assets';
import { DraftConflictError } from './admin-drafts';
import { inspectZip, ZIP_LIMIT } from './asset-validation';
import type { Database } from '../supabase/database.types';

describe('Storage compensation with the installed SDK', () => {
  let clientNumber = 0;
  const addonId = '11111111-1111-4111-8111-111111111111', id = '22222222-2222-4222-8222-222222222222';
  const revision='33333333-3333-4333-8333-333333333333';
  const path = `${addonId}/${id}/${revision}.zip`;
  const bytes = zipSync({ 'Prueba/Prueba.toc': strToU8('## Interface: 16001') });
  const info = inspectZip(bytes, 'prueba.zip');
  const file = { size: bytes.length, name: 'prueba.zip', arrayBuffer: async () => bytes.buffer } as File;
  function scenario(mode: 'failed' | 'committed' | 'existing' | 'unknown' | 'cleanup-failed') {
    let uploadedPath=path;
    const cleanup = vi.fn(); const upload = vi.fn();
    const transport: typeof fetch = async (input, init) => {
      const url = new URL(String(input));
      if (url.pathname.includes('/rest/v1/rpc/admin_access')) { return Response.json('admin'); }
      if (url.pathname.includes('/rest/v1/rpc/draft_asset_status')) { return Response.json({ready:true,pending:[]}); }
      if (url.pathname.includes('/rest/v1/rpc/retire_asset_object')) { return Response.json(true); }
      if (url.pathname.includes('/storage/v1/object/list/')) { return Response.json([]); }
      if (url.pathname.includes('/rest/v1/addons')) { return Response.json({ id: addonId }); }
      if (url.pathname.includes('/rest/v1/addon_releases')) {
        if (init?.method === 'PATCH') { return Response.json({ code: '42501', message: 'test failure' }, { status: 403 }); }
        if (!url.searchParams.has('updated_at') && mode === 'unknown') { return Response.json({ message: 'session expired' }, { status: 401 }); }
        const attached = mode === 'existing' || (!url.searchParams.has('updated_at') && mode === 'committed');
        return Response.json({ id, addon_id: addonId, status: 'draft', file_path: attached ? uploadedPath : null,
          file_size_bytes: info.size, sha256: info.sha256, updated_at: 'timestamp' });
      }
      if (init?.method === 'DELETE') {
        cleanup(JSON.parse(String(init.body)));
        return mode === 'cleanup-failed' ? Response.json({ message: 'cleanup failure' }, { status: 403 }) : Response.json([]);
      }
      upload(); expect(new Headers(init?.headers).get('x-upsert')).toBe('false');
      uploadedPath=url.pathname.split('/storage/v1/object/addon-files/')[1]!;
      return Response.json({ Key: `addon-files/${path}`, Id: id });
    };
    return { cleanup, upload,get path(){return uploadedPath;}, client: createClient<Database>('https://example.supabase.co', 'test-public-key', {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: `test-assets-${clientNumber++}` }, global: { fetch: transport },
    }) };
  }
  it('removes only the newly uploaded object if metadata failed and is not referenced', async () => {
    const test = scenario('failed');
    await expect(uploadDraftZip(test.client, addonId, id, 'timestamp', file)).rejects.toThrow('Se eliminó la subida nueva');
    expect(test.cleanup).toHaveBeenCalledWith({ prefixes: [test.path] });
  });
  it('keeps an object when a lost response actually committed metadata', async () => {
    const test = scenario('committed');
    const saved = await uploadDraftZip(test.client, addonId, id, 'timestamp', file);
    expect(saved.file_path).toBe(test.path); expect(test.cleanup).not.toHaveBeenCalled();
  });
  it('never overwrites an attached ZIP or deletes a file when reconciliation is unavailable', async () => {
    const existing = scenario('existing');
    await expect(uploadDraftZip(existing.client, addonId, id, 'timestamp', file)).rejects.toBeInstanceOf(DraftConflictError);
    expect(existing.upload).not.toHaveBeenCalled(); expect(existing.cleanup).not.toHaveBeenCalled();
    const unknown = scenario('unknown');
    await expect(uploadDraftZip(unknown.client, addonId, id, 'timestamp', file)).rejects.toThrow('Conservado para revisión');
    expect(unknown.cleanup).not.toHaveBeenCalled();
  });
  it('reports a failed cleanup and rejects oversize files before reading them', async () => {
    const test = scenario('cleanup-failed');
    await expect(uploadDraftZip(test.client, addonId, id, 'timestamp', file)).rejects.toThrow('limpieza requiere revisión');
    const read = vi.fn();
    await expect(uploadDraftZip(test.client, addonId, id, 'timestamp', { name: 'large.zip', size: ZIP_LIMIT + 1, arrayBuffer: read } as unknown as File)).rejects.toThrow('supera 50 MiB');
    expect(read).not.toHaveBeenCalled();
  });
});
