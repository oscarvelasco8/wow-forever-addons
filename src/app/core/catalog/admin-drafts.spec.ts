import { createClient } from '@supabase/supabase-js';
import { DraftConflictError, DraftValidationError, draftFields, releaseFields, saveDraft, saveDraftRelease, type DraftFields } from './admin-drafts';
import type { Database } from '../supabase/database.types';

const id = '11111111-1111-4111-8111-111111111111';
const fields: DraftFields = { name: 'Prueba', slug: 'prueba', category_id: id, summary: 'Resumen', description: 'Texto',
  author_name: 'Autor', license_name: 'Revisión pendiente', credits: 'Créditos', installation_instructions: 'Instalación' };

describe('Draft writes through the installed Supabase SDK', () => {
  it('sends only editable fields and requires the original draft timestamp', async () => {
    const transport = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      expect(init?.method).toBe('PATCH');
      expect(url.searchParams.get('status')).toBe('eq.draft');
      expect(url.searchParams.get('updated_at')).toBe('eq.2026-01-01T00:00:00Z');
      const body = JSON.parse(String(init?.body));
      expect(body).toEqual(fields);
      expect(body).not.toHaveProperty('distribution_approved');
      expect(body).not.toHaveProperty('status');
      return Response.json({ ...fields, id, status: 'draft', updated_at: '2026-01-02T00:00:00Z' });
    });
    const client = createClient<Database>('https://example.supabase.co', 'test-public-key', {
      auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: transport },
    });
    const saved = await saveDraft(client, id, '2026-01-01T00:00:00Z', { ...fields, status: 'published', distribution_approved: true } as DraftFields);
    expect(saved.updated_at).toBe('2026-01-02T00:00:00Z');
    expect(transport).toHaveBeenCalledOnce();
  });
  it('treats zero updated rows as a conflict instead of a successful save', async () => {
    const client = createClient<Database>('https://example.supabase.co', 'test-public-key', {
      auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: async () => Response.json(null) },
    });
    await expect(saveDraft(client, id, 'old-timestamp', fields)).rejects.toBeInstanceOf(DraftConflictError);
    await expect(saveDraftRelease(client, id, id, 'old-timestamp', { version: '1', game_version: 'Forever', interface_version: 1, changelog: '' })).rejects.toBeInstanceOf(DraftConflictError);
  });
  it('rejects invalid content before a write, including fractional interfaces', () => {
    expect(() => draftFields({ ...fields, name: '   ' })).toThrow(DraftValidationError);
    expect(() => draftFields({ ...fields, installation_instructions: 'x'.repeat(30001) })).toThrow(DraftValidationError);
    expect(() => releaseFields({ version: '1', game_version: 'Forever', interface_version: 1.5, changelog: '' })).toThrow(DraftValidationError);
  });
});
