import { zipSync, strToU8 } from 'fflate';
import { AssetValidationError, IMAGE_LIMIT, inspectImage, inspectZip } from './asset-validation';

describe('Upload content validation', () => {
  it('reads a ZIP index without extraction and hashes all package bytes', () => {
    const first = zipSync({ 'Prueba/Prueba.toc': strToU8('## Interface: 16001') });
    const second = zipSync({ 'Prueba/Prueba.toc': strToU8('## Interface: 16002') });
    const result = inspectZip(first, 'prueba.zip');
    expect(result.entries).toBe(1); expect(result.size).toBe(first.length);
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.sha256).not.toBe(inspectZip(second, 'prueba.zip').sha256);
  });
  it('rejects path traversal, missing manifests, spoofed ZIPs and oversized expansion declarations', () => {
    expect(() => inspectZip(zipSync({ '../Prueba/Prueba.toc': strToU8('test') }), 'bad.zip')).toThrow(AssetValidationError);
    expect(() => inspectZip(zipSync({ 'Prueba/README.txt': strToU8('test') }), 'bad.zip')).toThrow(AssetValidationError);
    expect(() => inspectZip(strToU8('Not a ZIP'), 'bad.zip')).toThrow(AssetValidationError);
    const bomb = zipSync({ 'Prueba/Prueba.toc': strToU8('test') });
    const view = new DataView(bomb.buffer);
    for (let i = 0; i < bomb.length - 46; i++) {
      if (view.getUint32(i, true) === 0x02014b50) { view.setUint32(i + 24, 251 * 1024 * 1024, true); break; }
    }
    expect(() => inspectZip(bomb, 'bad.zip')).toThrow(AssetValidationError);
  });
  it('checks image signature and extension instead of trusting a browser MIME label', () => {
    const png = new Uint8Array([137,80,78,71,13,10,26,10]);
    expect(inspectImage(png, 'image.png').mime).toBe('image/png');
    expect(() => inspectImage(png, 'image.jpg')).toThrow(AssetValidationError);
    expect(() => inspectImage(strToU8('<svg/>'), 'image.png')).toThrow(AssetValidationError);
    expect(() => inspectImage(new Uint8Array(IMAGE_LIMIT + 1), 'large.png')).toThrow(AssetValidationError);
  });
});
