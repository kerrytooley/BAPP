import JSZip from 'jszip';
import type { Packager, PackFile } from './ports';

export interface JsZipPackagerOptions {
  /** `STORE` skips JS-side DEFLATE, which is slow on Hermes and gains little on images/xlsx. */
  compression?: 'STORE' | 'DEFLATE';
}

/**
 * A {@link Packager} backed by JSZip. Works unchanged in Node and React Native
 * (Hermes), so the same adapter is used in tests and on-device.
 */
export class JsZipPackager implements Packager {
  constructor(private readonly options: JsZipPackagerOptions = {}) {}

  async pack(files: PackFile[]): Promise<Uint8Array> {
    const zip = new JSZip();
    const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
    for (const file of files) {
      // Native UTF-8 encoding beats JSZip's per-char JS encoder on large HTML.
      const data = typeof file.data === 'string' && encoder ? encoder.encode(file.data) : file.data;
      zip.file(file.path, data);
    }
    const compression = this.options.compression ?? 'DEFLATE';
    return zip.generateAsync({
      type: 'uint8array',
      compression,
      ...(compression === 'DEFLATE' ? { compressionOptions: { level: 6 } } : {}),
    });
  }
}
