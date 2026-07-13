import type { MediaRepository, UploadOptions, UploadResult } from '@bapp/domain';
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

/** Sanitize the final path segment for filesystem/storage safety. */
function sanitizePath(path: string): string {
  const slash = path.lastIndexOf('/');
  const dir = slash >= 0 ? path.slice(0, slash + 1) : '';
  const name = (slash >= 0 ? path.slice(slash + 1) : path)
    .replace(/[/\\]/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '_');
  return dir + name;
}

export class InMemoryMediaRepository implements MediaRepository {
  private store = new Map<string, ArrayBuffer>();

  async upload(
    path: string,
    data: ArrayBuffer | Uint8Array,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    // Storage-layout and name-sanitization knowledge lives in the adapter, not
    // the domain. The caller passes a logical path; we own the safe form.
    const sourceRef = sanitizePath(path);
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    this.store.set(sourceRef, buffer);

    // Uploads are atomic here; report completion once for progress-aware callers.
    options?.onProgress?.(1);

    // Stand in for server-side rasterization: a PDF is normalized to a
    // displayable PNG at a derived path. The in-memory fake does this
    // synchronously and reports `ready`; a real async adapter would leave
    // `renderRef: null`, `status: 'processing'` and resolve it via writeback.
    if (isPdf(sourceRef, bytes)) {
      const renderRef = derivedImagePath(sourceRef);
      this.store.set(renderRef, placeholderPng());
      return { sourceRef, renderRef, status: 'ready' };
    }

    // Already a renderable raster: source and render are the same object.
    return { sourceRef, renderRef: sourceRef, status: 'ready' };
  }

  async getDownloadUrl(reference: string): Promise<string> {
    const buffer = this.store.get(reference);
    if (!buffer) throw new Error(`Media ${reference} not found`);
    const base64 = bytesToBase64(new Uint8Array(buffer));
    return `data:${mimeTypeFor(reference)};base64,${base64}`;
  }

  async delete(reference: string): Promise<void> {
    // Holistic: remove the reference and any artifact derived from it (a PDF
    // source's rasterized PNG, or vice versa). Idempotent.
    this.store.delete(reference);
    this.store.delete(derivedImagePath(reference));
  }

  async clearCache(_surveyId?: string): Promise<void> {
    // No separate offline cache in the in-memory fake — `getDownloadUrl` reads
    // straight from the store — so there is nothing to evict. The real adapter
    // deletes cached files from the device filesystem here.
  }
}
