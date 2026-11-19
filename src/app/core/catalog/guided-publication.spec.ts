import { zipSync, strToU8 } from 'fflate';
import { zipVersion, publishPreparedAddon } from './guided-publication';
import type { EditorialBundle } from './admin-editorial';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/database.types';
const fixture: EditorialBundle = {
  addon: {
    id: '11111111-1111-4111-8111-111111111111',
    slug: 'ejemplo',
    name: 'Ejemplo',
    summary: 'Resumen',
    description: '',
    installation_instructions: '',
    credits: '',
    author_name: 'Autor',
    license_name: 'Pendiente de revisión',
    category_id: '22222222-2222-4222-2222-222222222222',
    status: 'draft',
    distribution_approved: false,
    published_at: null,
    created_at: 'stamp',
    updated_at: 'stamp',
  },
  category: {
    id: '22222222-2222-4222-2222-222222222222',
    slug: 'herramientas',
    name: 'Herramientas',
    is_visible: true,
    sort_order: 0,
    created_at: 'stamp',
    updated_at: 'stamp',
  },
  releases: [
    {
      id: '33333333-3333-4333-8333-333333333333',
      addon_id: '11111111-1111-4111-8111-111111111111',
      version: '0.1.0',
      game_version: 'WoW Forever',
      interface_version: 16001,
      changelog: '',
      file_path: 'fixture.zip',
      file_size_bytes: 631,
      sha256: 'a'.repeat(64),
      status: 'draft',
      published_at: null,
      created_at: 'stamp',
      updated_at: 'stamp',
    },
  ],
  images: [],
  events: [],
};
describe('Guided publication through the installed SDK', () => {
  let state: EditorialBundle;
  let failRelease = false;
  let writes: string[] = [];
  const transport = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = new URL(String(input)).pathname;
    if (path.endsWith('/rpc/editorial_action')) {
      const c = JSON.parse(String(init?.body));
      writes.push(c.p_entity + ':' + c.p_action);
      if (c.p_entity === 'release' && failRelease)
        return Response.json(
          { code: '22023', message: 'EDITORIAL_FILE_REQUIRED' },
          { status: 400 },
        );
      if (c.p_entity === 'addon' && c.p_action === 'approve')
        state.addon.distribution_approved = true;
      if (c.p_entity === 'release') state.releases[0]!.status = 'published';
      if (c.p_entity === 'addon' && c.p_action === 'publish') state.addon.status = 'published';
      return Response.json({});
    }
    if (path.endsWith('/addons')) {
      if (init?.method === 'PATCH') {
        writes.push('permission');
        state.addon = { ...state.addon, ...JSON.parse(String(init.body)) };
      }
      return Response.json(state.addon);
    }
    if (path.endsWith('/addon_releases')) return Response.json(state.releases);
    if (path.endsWith('/addon_images')) return Response.json(state.images);
    if (path.endsWith('/editorial_events')) return Response.json(state.events);
    if (path.endsWith('/categories')) return Response.json(state.category);
    throw Error('Unexpected request');
  });
  const client = () =>
    createClient<Database>('https://example.supabase.co', 'test-key', {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: transport },
    });
  beforeEach(() => {
    transport.mockClear();
    state = structuredClone(fixture);
    failRelease = false;
    writes = [];
  });
  it('requires permission and a valid prepared release before any writes', async () => {
    await expect(
      publishPreparedAddon(
        client(),
        fixture.addon.id,
        fixture.releases[0]!.id,
        'stamp',
        true,
        false,
      ),
    ).rejects.toThrow('Confirma');
    expect(transport).not.toHaveBeenCalled();
    state.releases[0]!.file_path = null;
    await expect(
      publishPreparedAddon(
        client(),
        fixture.addon.id,
        fixture.releases[0]!.id,
        'stamp',
        true,
        true,
      ),
    ).rejects.toThrow('ZIP');
    expect(writes).toEqual([]);
  });
  it('records permission without selecting a license and publishes the parent last', async () => {
    await publishPreparedAddon(
      client(),
      fixture.addon.id,
      fixture.releases[0]!.id,
      'stamp',
      true,
      true,
    );
    expect(state.addon.license_name).toBe('Distribución autorizada por el titular');
    expect(state.addon.status).toBe('published');
    expect(writes).toEqual(['permission', 'addon:approve', 'release:publish', 'addon:publish']);
  });
  it('preserves an existing license and never publishes the parent after a failed release', async () => {
    state.addon.license_name = 'MIT';
    failRelease = true;
    await expect(
      publishPreparedAddon(
        client(),
        fixture.addon.id,
        fixture.releases[0]!.id,
        'stamp',
        true,
        true,
      ),
    ).rejects.toThrow('archivo');
    expect(writes).toEqual(['addon:approve', 'release:publish']);
    expect(state.addon.status).toBe('draft');
  });
  it('rejects stale data and hidden categories before approving anything', async () => {
    await expect(
      publishPreparedAddon(client(), fixture.addon.id, fixture.releases[0]!.id, 'old', true, true),
    ).rejects.toThrow();
    state.category.is_visible = false;
    await expect(
      publishPreparedAddon(
        client(),
        fixture.addon.id,
        fixture.releases[0]!.id,
        'stamp',
        true,
        true,
      ),
    ).rejects.toThrow('oculta');
    expect(writes).toEqual([]);
  });
  it('reads bounded unambiguous version metadata and rejects invalid paths', () => {
    const zip = (toc: string) => zipSync({ 'Demo/Demo.toc': strToU8(toc) });
    expect(zipVersion(zip('## Version: 0.0.1\n## Interface: 16001\n'), 'demo.zip')).toEqual({
      version: '0.0.1',
      interfaceVersion: 16001,
    });
    expect(zipVersion(zip('## Title: No version\n'), 'demo.zip')).toBeNull();
    expect(() => zipVersion(zipSync({ '../Demo.toc': strToU8('bad') }), 'bad.zip')).toThrow();
  });
});
