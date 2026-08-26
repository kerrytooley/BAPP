import JSZip from 'jszip';
import type { Packager, PackFile } from './ports';

/**
 * A {@link Packager} backed by JSZip. Works unchanged in Node and React Native
 * (Hermes), so the same adapter is used in tests and on-device.
 */
export class JsZipPackager implements Packager {
  async pack(files: PackFile[]): Promise<Uint8Array> {
    const zip = new JSZip();
    for (const file of files) {
      zip.file(file.path, file.data);
    }
    return zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
  }
}
