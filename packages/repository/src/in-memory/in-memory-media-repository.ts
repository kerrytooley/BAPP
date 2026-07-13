import type { MediaRepository } from '@bapp/domain';
import { isPdf, derivedImagePath } from '../media/boundary-media';

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Encodes bytes to a base64 string without relying on `Buffer` or `btoa`,
 * neither of which is guaranteed to exist in Hermes (React Native's engine).
 */
function bytesToBase64(bytes: Uint8Array): string {
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;

    result += BASE64_CHARS[b0 >> 2];
    result += BASE64_CHARS[((b0 & 0x03) << 4) | (b1 >> 4)];
    result += i + 1 < bytes.length ? BASE64_CHARS[((b1 & 0x0f) << 2) | (b2 >> 6)] : '=';
    result += i + 2 < bytes.length ? BASE64_CHARS[b2 & 0x3f] : '=';
  }
  return result;
}

/** Decodes a base64 string to bytes without relying on `Buffer` or `atob`. */
function base64ToBytes(base64: string): Uint8Array {
  const lookup = new Uint8Array(256);
  for (let i = 0; i < BASE64_CHARS.length; i++) {
    lookup[BASE64_CHARS.charCodeAt(i)] = i;
  }
  const clean = base64.replace(/=+$/, '');
  const outLength = Math.floor((clean.length * 3) / 4);
  const out = new Uint8Array(outLength);
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = lookup[clean.charCodeAt(i)];
    const c1 = lookup[clean.charCodeAt(i + 1)];
    const c2 = i + 2 < clean.length ? lookup[clean.charCodeAt(i + 2)] : 0;
    const c3 = i + 3 < clean.length ? lookup[clean.charCodeAt(i + 3)] : 0;
    out[p++] = (c0 << 2) | (c1 >> 4);
    if (p < outLength) out[p++] = ((c1 & 0x0f) << 4) | (c2 >> 2);
    if (p < outLength) out[p++] = ((c2 & 0x03) << 6) | c3;
  }
  return out;
}

// 400x300 grey PNG standing in for a rasterized PDF page (no Cloud Function
// runs in-memory). Enough to exercise the boundary flow; not the real page.
const PLACEHOLDER_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAZAAAAEsCAIAAABi1XKVAAADHklEQVR42u3UMQ0AIAwAwfrXwIaAqiIMmMAETUpyySn44WPMBPhCSAAYFkDZsNY+AA0ZFmBYAIYFGJZhAYYFYFiAYRkWYFgAhgUYFoBhARgWYFgAhgVgWIBhARgWgGEBhgVgWACGBRgWgGEBGBZgWACGBWBYgGEBGBZgWIYFGBaAYQGGZViAYQEYFmBYogCGBWBYgGEBGBaAYQGGBWBYAIYFGBaAYQEYFmBYAIYFYFiAYQEYFoBhAYYFYFgAhgUYFoBhAYZlWIBhARgWYFiGBRgWgGEBhqULYFgAhgUYFoBhARgWYFgAhgVgWIBhARgWgGEBhgVgWACGBRgWgGEBGBZgWACGBWBYgGEBGBZgWIYFGBaAYQGGZViAYQEYFmBYugCGBWBYgGEBGBaAYQGGBWBYAIYFGBaAYQEYFmBYAIYFYFiAYQEYFoBhAYYFYFgAhgUYFoBhAYZlWIBhARgWYFiGBRgWgGEBhgVgWACGBRgWgGEBGBZgWACGBWBYgGEBGBaAYQGGBWBYAIYFGBaAYQEYFmBYAIYFYFiAYQEYFmBYhgUYFoBhAYZlWIBhARgWYFgAhgVgWIBhARgWgGEBhgVgWACGBRgWgGEBGBZgWACGBWBYgGEBGBaAYQGGBWBYAIYFGBaAYQGGZViAYQEYFmBYhgUYFoBhAYYFYFgAhgUYFoBhARgWYFgAhgVgWIBhARgWgGEBhgVgWACGBRgWgGEBGBZgWACGBWBYgGEBGBZgWIYFGBaAYQGGZViAYQEYFmBYAIYFYFiAYQEYFoBhAYYFYFgAhgUYFoBhARgWYFgAhgVgWIBhARgWgGEBhgVgWACGBRgWgGEBhmVYgGEBGBZgWIYFGBaAYQGGBWBYAIYFGBaAYQEYFmBYAIYFYFiAYQEYFoBhAYYFYFgAhgUYFoBhARgWYFgAhgVgWIBhARgWYFiGBRgWgGEBhmVYgGEBGBZgWACGBWBYgGEBGBaAYQGGBWBYAIYFGBaAYQEYFmBYAIYFYFiAYQEYFoBhAYYFYFiAYRkWYFgAhgUYlmEBhgVgWIBhATRnWIBhAbx2AWWeGbEYZfrIAAAAAElFTkSuQmCC';

let placeholderPngBuffer: ArrayBuffer | undefined;
function placeholderPng(): ArrayBuffer {
  if (!placeholderPngBuffer) {
    const bytes = base64ToBytes(PLACEHOLDER_PNG_BASE64);
    placeholderPngBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  }
  return placeholderPngBuffer.slice(0) as ArrayBuffer;
}

const MIME_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  pdf: 'application/pdf',
};

function mimeTypeFor(reference: string): string {
  const extension = reference.split('.').pop()?.toLowerCase() ?? '';
  return MIME_TYPES[extension] ?? 'application/octet-stream';
}

export class InMemoryMediaRepository implements MediaRepository {
  private store = new Map<string, ArrayBuffer>();

  async upload(path: string, data: ArrayBuffer | Uint8Array): Promise<string> {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    this.store.set(path, buffer);

    // Stand in for server-side rasterization: store a placeholder PNG at the
    // derived path and return that ref, matching the Firebase adapter's contract.
    if (isPdf(path, bytes)) {
      const pngPath = derivedImagePath(path);
      this.store.set(pngPath, placeholderPng());
      return pngPath;
    }

    return path;
  }

  async getDownloadUrl(reference: string): Promise<string> {
    const buffer = this.store.get(reference);
    if (!buffer) throw new Error(`Media ${reference} not found`);
    const base64 = bytesToBase64(new Uint8Array(buffer));
    return `data:${mimeTypeFor(reference)};base64,${base64}`;
  }

  async delete(reference: string): Promise<void> {
    this.store.delete(reference);
  }
}
