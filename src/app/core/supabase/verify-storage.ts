import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/** Explicit, disposable HTTP diagnostics. Never read/export authentication tokens. */
export async function verifyStorage(client: SupabaseClient<Database>,
  anonymous: SupabaseClient<Database>): Promise<string[]> {
  const results: string[] = [];
  // getRandomValues also works on this project's HTTP LAN preview.
  const id = Array.from(crypto.getRandomValues(new Uint8Array(16)),
    value => value.toString(16).padStart(2, '0')).join('');
  const prefix = `_verification/${id}`;
  const require = (condition: unknown, message: string) => {
    if (!condition) { throw new Error(message); }
  };
  for (const bucket of ['addon-files', 'addon-images']) {
    const storage = client.storage.from(bucket);
    const visitor = anonymous.storage.from(bucket);
    const image = bucket === 'addon-images';
    const path = `${prefix}/probe.${image ? 'png' : 'zip'}`;
    const badMime = `${prefix}/invalid.txt`;
    const oversized = `${prefix}/oversized.${image ? 'png' : 'zip'}`;
    const contentType = image ? 'image/png' : 'application/zip';
    const bytes = image
      ? Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='), c => c.charCodeAt(0))
      : new Uint8Array([80, 75, 5, 6, ...new Array<number>(18).fill(0)]);
    try {
      const upload = await storage.upload(path, bytes, { contentType });
      require(!upload.error, `${bucket}: falló la subida.`);
      results.push(`${bucket}: subida real correcta.`);
      const replace = await storage.upload(path, bytes, { contentType, upsert: true });
      require(!replace.error, `${bucket}: falló el reemplazo.`);
      const downloaded = await storage.download(path);
      require(!downloaded.error && downloaded.data, `${bucket}: falló la descarga.`);
      const actual = new Uint8Array(await downloaded.data!.arrayBuffer());
      require(actual.length === bytes.length && actual.every((v, i) => v === bytes[i]),
        `${bucket}: contenido descargado distinto.`);
      results.push(`${bucket}: reemplazo y descarga idéntica correctos.`);

      require(!!(await visitor.download(path)).error, `${bucket}: borrador expuesto.`);
      require(!!(await visitor.createSignedUrl(path, 10)).error, `${bucket}: firma anónima permitida.`);
      const listed = await visitor.list(prefix);
      require(!listed.data?.length, `${bucket}: listado anónimo expuesto.`);
      const publicUrl = visitor.getPublicUrl(path).data.publicUrl;
      require(!(await fetch(publicUrl, { cache: 'no-store' })).ok, `${bucket}: URL pública expuesta.`);
      results.push(`${bucket}: borrador real oculto al visitante, incluida URL pública.`);

      const signed = await storage.createSignedUrl(path, 2);
      require(!signed.error && signed.data, `${bucket}: falló la firma administrativa.`);
      require((await fetch(signed.data!.signedUrl, { cache: 'no-store' })).ok, `${bucket}: enlace firmado inaccesible.`);
      await new Promise(resolve => setTimeout(resolve, 3500));
      require(!(await fetch(signed.data!.signedUrl, { cache: 'no-store' })).ok, `${bucket}: enlace firmado no caducó.`);
      results.push(`${bucket}: enlace firmado accesible y caducidad HTTP comprobada.`);

      const mime = await storage.upload(badMime, new Uint8Array([1]), { contentType: 'text/plain' });
      require(!!mime.error && /mime|type/i.test(mime.error.message), `${bucket}: MIME no rechazado por tipo.`);
      const large = new Uint8Array((image ? 5 : 50) * 1024 * 1024 + 1);
      const limit = await storage.upload(oversized, large, { contentType });
      require(!!limit.error && /size|large|exceed/i.test(limit.error.message), `${bucket}: tamaño no rechazado por límite.`);
      results.push(`${bucket}: MIME inválido y exceso de ${image ? '5' : '50'} MiB rechazados por HTTP.`);
    } finally {
      const cleanup = await storage.remove([path, badMime, oversized]);
      require(!cleanup.error, `${bucket}: limpieza pendiente en ${prefix}.`);
      const remaining = await storage.list(prefix);
      require(!remaining.error && !remaining.data?.length, `${bucket}: quedan archivos en ${prefix}.`);
    }
    results.push(`${bucket}: archivos de prueba eliminados y ausencia comprobada.`);
  }
  return results;
}
