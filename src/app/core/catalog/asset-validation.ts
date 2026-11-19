import { unzipSync } from 'fflate';
import { sha256 } from '@noble/hashes/sha2.js';

export const ZIP_LIMIT = 50 * 1024 * 1024;
export const IMAGE_LIMIT = 5 * 1024 * 1024;
export class AssetValidationError extends Error {}
export function assetId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 15) | 64; bytes[8] = (bytes[8]! & 63) | 128;
  const h = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
export function inspectZip(bytes: Uint8Array, name: string): { sha256: string; size: number; entries: number } {
  if (!/\.zip$/i.test(name) || bytes.length < 22 || bytes.length > ZIP_LIMIT || bytes[0] !== 80 || bytes[1] !== 75) {
    throw new AssetValidationError('Selecciona un ZIP válido de hasta 50 MiB.');
  }
  let entries = 0, expanded = 0, toc = false;
  const names = new Set<string>();
  try {
    // Read the archive index only. Never inflate, execute or write its contents.
    unzipSync(bytes, { filter: file => {
      entries++; expanded += file.originalSize;
      const path = file.name.normalize('NFC');
      const parts = path.replace(/\/$/, '').split('/');
      if (entries > 10000 || expanded > 250 * 1024 * 1024 || ![0, 8].includes(file.compression) ||
        /[\\:\x00-\x1f<>"|?*]/.test(path) || path.startsWith('/') || parts.some(part => !part || part === '.' || part === '..' || /[. ]$/.test(part)) ||
        names.has(path.toLowerCase())) {
        throw new AssetValidationError('El ZIP contiene rutas no válidas, nombres duplicados o supera los límites de estructura.');
      }
      names.add(path.toLowerCase());
      if (parts.length >= 2 && /\.toc$/i.test(path) && file.originalSize > 0) { toc = true; }
      return false;
    } });
  } catch (error) {
    if (error instanceof AssetValidationError) { throw error; }
    throw new AssetValidationError('No se pudo leer la estructura del ZIP.');
  }
  if (!entries || !toc) { throw new AssetValidationError('El ZIP debe contener una carpeta de addon con al menos un archivo .toc.'); }
  return { sha256: Array.from(sha256(bytes), b => b.toString(16).padStart(2, '0')).join(''), size: bytes.length, entries };
}
export function inspectImage(bytes: Uint8Array, name: string): { extension: 'png' | 'jpg' | 'webp'; mime: string } {
  if (!bytes.length || bytes.length > IMAGE_LIMIT) { throw new AssetValidationError('La imagen debe ocupar entre 1 byte y 5 MiB.'); }
  const prefix = (values: number[]) => values.every((value, i) => bytes[i] === value);
  if (/\.png$/i.test(name) && prefix([137,80,78,71,13,10,26,10])) { return { extension: 'png', mime: 'image/png' }; }
  if (/\.jpe?g$/i.test(name) && prefix([255,216,255])) { return { extension: 'jpg', mime: 'image/jpeg' }; }
  if (/\.webp$/i.test(name) && prefix([82,73,70,70]) && [87,69,66,80].every((value,i) => bytes[i+8] === value)) { return { extension: 'webp', mime: 'image/webp' }; }
  throw new AssetValidationError('Selecciona una imagen PNG, JPEG o WebP cuyo contenido coincida con la extensión.');
}
export async function validateImageFile(file: File): Promise<{ extension: 'png' | 'jpg' | 'webp'; mime: string }> {
  if (file.size > IMAGE_LIMIT) { throw new AssetValidationError('La imagen supera 5 MiB.'); }
  const type = inspectImage(new Uint8Array(await file.arrayBuffer()), file.name);
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url; await image.decode();
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth > 8192 || image.naturalHeight > 8192 || image.naturalWidth * image.naturalHeight > 32000000) {
      throw new AssetValidationError('La imagen supera 8192 píxeles por lado o 32 megapíxeles.');
    }
  } catch (error) {
    if (error instanceof AssetValidationError) { throw error; }
    throw new AssetValidationError('El navegador no pudo leer la imagen.');
  } finally { URL.revokeObjectURL(url); }
  return type;
}
