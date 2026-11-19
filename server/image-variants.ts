export const IMAGE_WIDTHS = { thumb: 320, card: 640, display: 1280 } as const;
export type ImageVariant = keyof typeof IMAGE_WIDTHS;
const LIMIT = 5 * 1024 * 1024;
export async function boundedImage(response: Response): Promise<Buffer> {
  if (Number(response.headers.get('content-length')) > LIMIT || !response.body) {
    throw new Error('Invalid source size.');
  }
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) {
        break;
      }
      size += result.value.length;
      if (size > LIMIT) {
        await reader.cancel();
        throw new Error('Image too large.');
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, size);
}
export async function optimizeImage(bytes: Buffer, variant: ImageVariant): Promise<Buffer> {
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp =
    bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!bytes.length || bytes.length > LIMIT || (!png && !jpeg && !webp)) {
    throw new Error('Unsupported source image.');
  }
  const { default: sharp } = await import('sharp');
  const image = sharp(bytes, {
    limitInputPixels: 32000000,
    animated: false,
    failOn: 'error',
  }).timeout({ seconds: 5 });
  const metadata = await image.metadata();
  if (
    !['png', 'jpeg', 'webp'].includes(metadata.format ?? '') ||
    !metadata.width ||
    !metadata.height ||
    metadata.width > 8192 ||
    metadata.height > 8192
  ) {
    throw new Error('Invalid source image.');
  }
  return image
    .rotate()
    .resize({
      width: IMAGE_WIDTHS[variant],
      height: IMAGE_WIDTHS[variant],
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 78, effort: 3 })
    .toBuffer();
}
