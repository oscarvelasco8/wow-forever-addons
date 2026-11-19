import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

function uuid(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 15) | 64; bytes[8] = (bytes[8]! & 63) | 128;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Disposable, explicitly labelled fixtures; never touches the Rumbo rows. */
export async function verifyPublication(admin: SupabaseClient<Database>,
  visitor: SupabaseClient<Database>): Promise<string[]> {
  const categoryId = uuid(), addonId = uuid(), releaseId = uuid(), imageId = uuid();
  const zipPath = `${addonId}/${releaseId}.zip`, imagePath = `${addonId}/${imageId}.png`;
  const zip = new Uint8Array([80, 75, 5, 6, ...new Array<number>(18).fill(0)]);
  const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='), c => c.charCodeAt(0));
  const results: string[] = [];
  const require = (condition: unknown, message: string) => { if (!condition) { throw new Error(message); } };
  const write = async (operation: PromiseLike<{ error: unknown }>, message: string) => {
    require(!(await operation).error, message);
  };
  const publishedAt = new Date(Date.now() - 60000).toISOString();
  async function websiteVisibility(expected: boolean) {
    const response = await fetch('/api/catalog?q='+encodeURIComponent(addonId), { credentials: 'omit', cache: 'no-store' });
    require(response.ok, 'La API web del catálogo no respondió.');
    const data = await response.json();
    require(Array.isArray(data.addons) && data.addons.some((addon: { slug: string }) => addon.slug === `verification-${addonId}`) === expected,
      'La API web mostró una publicación incorrecta.');
  }
  async function visibility(expectedZip: boolean, expectedImage: boolean, label: string) {
    const release = await visitor.from('addon_releases').select('id').eq('id', releaseId);
    const image = await visitor.from('addon_images').select('id').eq('id', imageId);
    require(!release.error && release.data.length === Number(expectedZip), `${label}: visibilidad de versión incorrecta.`);
    require(!image.error && image.data.length === Number(expectedImage), `${label}: visibilidad de imagen incorrecta.`);
    for (const [bucket, path, expected, bytes] of [
      ['addon-files', zipPath, expectedZip, zip], ['addon-images', imagePath, expectedImage, png],
    ] as const) {
      const download = await visitor.storage.from(bucket).download(path);
      if (expected) {
        require(!download.error && download.data, `${label}: descarga gratuita denegada en ${bucket}.`);
        const received = new Uint8Array(await download.data!.arrayBuffer());
        require(received.length === bytes.length && received.every((b, i) => b === bytes[i]), `${label}: bytes distintos.`);
      } else { require(!!download.error, `${label}: archivo oculto descargable en ${bucket}.`); }
    }
    results.push(`${label}: metadatos y archivos HTTP correctos.`);
  }
  try {
    await write(admin.from('categories').insert({ id: categoryId, slug: `verification-${categoryId}`,
      name: 'Verificación temporal — borrar', is_visible: true }), 'No se creó categoría de prueba.');
    await write(admin.from('addons').insert({ id: addonId, category_id: categoryId,
      slug: `verification-${addonId}`, name: 'Prueba técnica temporal — no es un addon',
      summary: 'Archivo vacío generado para verificar permisos; se elimina automáticamente. '+addonId,
      author_name: 'WoW Forever Addons — verificación', license_name: 'CC0 — archivo vacío propio',
      distribution_approved: true }), 'No se creó producto de prueba.');
    await write(admin.from('addon_releases').insert({ id: releaseId, addon_id: addonId, version: 'test-0',
      game_version: 'Solo prueba HTTP', interface_version: 1, file_path: zipPath, file_size_bytes: zip.length,
      sha256: '8739c76e681f900923b900c9df0ef75cf421d39cabb54650c4b9ad19b6a76d85' }), 'No se creó versión de prueba.');
    await write(admin.from('addon_images').insert({ id: imageId, addon_id: addonId, file_path: imagePath,
      alt_text: 'Píxel generado de prueba' }), 'No se creó imagen de prueba.');
    await write(admin.storage.from('addon-files').upload(zipPath, zip, { contentType: 'application/zip', cacheControl: '0' }), 'No se subió ZIP de prueba.');
    await write(admin.storage.from('addon-images').upload(imagePath, png, { contentType: 'image/png', cacheControl: '0' }), 'No se subió PNG de prueba.');
    await visibility(false, false, 'Borrador');
    await websiteVisibility(false);
    await write(admin.from('addon_releases').update({ status: 'published', published_at: publishedAt }).eq('id', releaseId), 'No se publicó versión temporal.');
    await write(admin.from('addon_images').update({ is_published: true }).eq('id', imageId), 'No se publicó imagen temporal.');
    await visibility(false, false, 'Hijos publicados con producto borrador');
    await write(admin.from('addons').update({ status: 'published', published_at: publishedAt }).eq('id', addonId), 'No se publicó producto temporal.');
    await visibility(true, true, 'Publicación sin cuenta ni pago');
    await websiteVisibility(true);
    const webDownload = await fetch(`/api/download?release=${releaseId}`, { credentials: 'omit', cache: 'no-store' });
    require(webDownload.ok, 'La descarga web publicada no respondió.');
    const webBytes = new Uint8Array(await webDownload.arrayBuffer());
    require(webBytes.length === zip.length && webBytes.every((value, i) => value === zip[i]), 'El ZIP descargado desde la web es distinto.');
    results.push('Web: catálogo publicado y descarga gratuita idéntica mediante API propia.');
    const galleryImage=await fetch(`/api/image?image=${imageId}`,{credentials:'omit',cache:'no-store'});
    require(galleryImage.ok,'La imagen publicada no respondió desde la API de la galería.');
    const galleryBytes=new Uint8Array(await galleryImage.arrayBuffer());
    require(galleryBytes.length===png.length && galleryBytes.every((value,index)=>value===png[index]),'La imagen recibida desde la galería es distinta.');
    results.push('Web: imagen de galería publicada y bytes idénticos sin cuenta ni pago.');
    const attempt = await visitor.from('addons').update({ name: 'Cambio anónimo prohibido' }).eq('id', addonId).select('id');
    require(!!attempt.error || attempt.data?.length === 0, 'El visitante pudo modificar el producto.');
    const unchanged = await admin.from('addons').select('name').eq('id', addonId).single();
    require(!unchanged.error && unchanged.data.name === 'Prueba técnica temporal — no es un addon', 'La escritura anónima modificó datos.');
    const overwrite = await visitor.storage.from('addon-files').upload(zipPath, zip, { contentType: 'application/zip', upsert: true });
    require(!!overwrite.error, 'El visitante reemplazó un ZIP publicado.');
    results.push('Visitante: modificación de metadatos y reemplazo de ZIP denegados.');
    const signed = await visitor.storage.from('addon-files').createSignedUrl(zipPath, 2);
    require(!signed.error && signed.data, 'El visitante no pudo firmar la descarga publicada.');
    require((await fetch(signed.data!.signedUrl, { cache: 'no-store' })).ok, 'URL firmada publicada inaccesible.');
    await write(admin.from('addon_releases').update({ status: 'archived' }).eq('id', releaseId), 'No se retiró versión temporal.');
    await visibility(false, true, 'Versión retirada e imagen aún publicada');
    require((await fetch(`/api/download?release=${releaseId}`, { credentials: 'omit', cache: 'no-store' })).status === 404,
      'La descarga web no bloqueó la versión retirada.');
    results.push('Web: versión retirada devuelve 404 y no genera una descarga nueva.');
    require(!!(await visitor.storage.from('addon-files').createSignedUrl(zipPath, 2)).error, 'Se firmó una versión retirada.');
    // Issued URLs are bearer capabilities: withdrawing metadata does not revoke them.
    await new Promise(resolve => setTimeout(resolve, 3500));
    require(!(await fetch(signed.data!.signedUrl, { cache: 'no-store' })).ok, 'El enlace previo no caducó.');
    results.push('Retirada: nuevas firmas denegadas y enlace previo caducado por HTTP.');
    await write(admin.from('addon_releases').update({ status: 'published' }).eq('id', releaseId), 'No se restauró versión temporal.');
    await write(admin.from('addons').update({ status: 'draft' }).eq('id', addonId), 'No se ocultó producto temporal.');
    await visibility(false, false, 'Producto devuelto a borrador');
    await websiteVisibility(false);
    require((await fetch(`/api/image?image=${imageId}`,{credentials:'omit',cache:'no-store'})).status===404,'La API de imágenes no ocultó el producto borrador.');
    await write(admin.from('addons').update({ status: 'published' }).eq('id', addonId), 'No se restauró producto temporal.');
    await write(admin.from('categories').update({ is_visible: false }).eq('id', categoryId), 'No se ocultó categoría temporal.');
    await visibility(false, false, 'Categoría oculta');
    await websiteVisibility(false);
    require((await fetch(`/api/image?image=${imageId}`,{credentials:'omit',cache:'no-store'})).status===404,'La API de imágenes no ocultó la categoría.');
    results.push('Web: galería bloqueada al ocultar el addon o su categoría.');
  } finally {
    // Hide first; attempt every cleanup even if an earlier deletion fails.
    const cleanup = await Promise.allSettled([
      admin.from('categories').update({ is_visible: false }).eq('id', categoryId),
      admin.from('addons').update({ status: 'draft' }).eq('id', addonId),
    ]);
    // Only these generated disposable fixtures are returned to draft before cleanup.
    const reset = await Promise.allSettled([
      admin.from('addon_releases').update({status:'draft',published_at:null}).eq('id',releaseId),
      admin.from('addon_images').update({is_published:false}).eq('id',imageId),
    ]);
    const children = await Promise.allSettled([
      admin.from('addon_images').delete().eq('id', imageId), admin.from('addon_releases').delete().eq('id', releaseId),
    ]);
    // Metadata deletion retires canonical paths before the Storage API removes bytes.
    const objectCleanup = await Promise.allSettled([
      admin.storage.from('addon-files').remove([zipPath]), admin.storage.from('addon-images').remove([imagePath]),
    ]);
    const parent = await admin.from('addons').delete().eq('id', addonId);
    const category = await admin.from('categories').delete().eq('id', categoryId);
    const remaining = await Promise.all([
      admin.from('categories').select('id').eq('id', categoryId), admin.from('addons').select('id').eq('id', addonId),
      admin.from('addon_releases').select('id').eq('id', releaseId), admin.from('addon_images').select('id').eq('id', imageId),
      admin.storage.from('addon-files').list(addonId), admin.storage.from('addon-images').list(addonId),
    ]);
    require([...cleanup, ...reset, ...objectCleanup, ...children].every(r => r.status === 'fulfilled' && !r.value.error)
      && !parent.error && !category.error && remaining.every(r => !r.error && r.data?.length === 0),
    `Limpieza incompleta: revisar producto ${addonId} y categoría ${categoryId}.`);
  }
  results.push('Limpieza: cero archivos y cero filas temporales de catálogo, comprobado por API. El historial conserva los eventos de prueba.');
  return results;
}
