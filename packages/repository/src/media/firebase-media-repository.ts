import type { MediaRepository, UploadOptions, UploadResult } from '@bapp/domain';
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  type FirebaseStorageTypes,
} from '@react-native-firebase/storage';
// SDK 54's default expo-file-system export is the new File/Directory API; the
// functional API the caching design uses (downloadAsync/getInfoAsync/…) is the
// `/legacy` entry point.
import * as FileSystem from 'expo-file-system/legacy';
import { getFirebaseStorage } from '../config/firebase-app';
import { isPdf, derivedImagePath } from './boundary-media';

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Encode bytes to base64 without `Buffer`/`btoa` (neither is guaranteed in
 * Hermes). Used to write picked media into the on-device cache via
 * `expo-file-system`, which takes a base64 string for binary writes.
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

/** Sanitize the final path segment for storage safety (adapter-owned, per the port doc). */
function sanitizePath(path: string): string {
  const slash = path.lastIndexOf('/');
  const dir = slash >= 0 ? path.slice(0, slash + 1) : '';
  const name = (slash >= 0 ? path.slice(slash + 1) : path)
    .replace(/[/\\]/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '_');
  return dir + name;
}

/** Root of the on-device offline cache. Mirrors storage ref paths beneath it so
 *  a reference maps 1:1 to a cache file and survey-scoped clearing is a dir delete. */
const CACHE_ROOT = `${FileSystem.cacheDirectory ?? ''}bapp-media/`;

function cachePathFor(reference: string): string {
  return `${CACHE_ROOT}${reference}`;
}

function parentDir(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash >= 0 ? path.slice(0, slash) : path;
}

export class FirebaseMediaRepository implements MediaRepository {
  async upload(
    path: string,
    data: ArrayBuffer | Uint8Array,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    const sourceRef = sanitizePath(path);
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    const contentType = options?.contentType ?? mimeTypeFor(sourceRef);

    // Offline-first: persist the picked bytes to the local cache FIRST, keyed by
    // the storage ref, so the originating device can render this media from a
    // `file://` URI immediately — with no network round-trip and while fully
    // offline. `getDownloadUrl(sourceRef)` will hit this cache. This is what lets
    // a surveyor in the field add media and keep operating on it before (or
    // without) any upload.
    const cachePath = cachePathFor(sourceRef);
    await FileSystem.makeDirectoryAsync(parentDir(cachePath), { intermediates: true });
    await FileSystem.writeAsStringAsync(cachePath, bytesToBase64(bytes), {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Start the resumable upload but DO NOT await its completion. Offline it
    // cannot finish; awaiting here would hang `setBoundaryImage`/`setLocationImage`
    // and block the surveyor. Resolving reflects "source recorded and locally
    // usable", not "bytes reached Storage" — the doc's eventually-consistent
    // write contract. The upload runs/resumes in the background and flushes when
    // connectivity returns.
    // NOTE (device-time hardening): since the bytes are now on disk at
    // `cachePath`, uploading via RNFB's `putFile(ref, cachePath)` is more robust
    // than a byte buffer; left as `uploadBytesResumable` for now because the
    // input choice can only be validated on a real device — see firebase/README.
    const task = uploadBytesResumable(
      storageRef(getFirebaseStorage(), sourceRef),
      bytes,
      { contentType },
    );
    if (options?.onProgress) {
      task.on('state_changed', (snapshot: FirebaseStorageTypes.TaskSnapshot) => {
        if (snapshot.totalBytes > 0) {
          options.onProgress!(snapshot.bytesTransferred / snapshot.totalBytes);
        }
      });
    }
    // Swallow background failures: a dropped/failed upload must not surface as a
    // rejected `upload()` — the source is already recorded and locally drawable,
    // and RNFB resumes the task. (A launch-time sweep of unsent media is the
    // durability backstop across app kills — see firebase/README.)
    task.then(undefined, () => undefined);

    // A PDF (or other non-renderable source) is rasterized asynchronously by a
    // Cloud Function, which writes `renderRef` + `status: 'ready'` back onto the
    // parent doc. Resolving here means only that the source is recorded — so
    // return `processing` with no render yet. (No function runs against the bare
    // emulator, so the render stays pending in local dev — see firebase/README.)
    if (isPdf(sourceRef, bytes)) {
      return { sourceRef, renderRef: null, status: 'processing' };
    }
    // Already a renderable raster: source is its own render, and the originating
    // device draws it straight from the cache we just seeded — `ready` is honest
    // even offline (the `processing` status is a signal for OTHER devices).
    return { sourceRef, renderRef: sourceRef, status: 'ready' };
  }

  async getDownloadUrl(reference: string): Promise<string> {
    const cachePath = cachePathFor(reference);
    const info = await FileSystem.getInfoAsync(cachePath);
    if (info.exists) return info.uri;

    // Cache miss: resolve the remote URL, download into the cache, return the
    // local file:// URI so the caller can render it offline afterwards.
    const url = await getDownloadURL(storageRef(getFirebaseStorage(), reference));
    await FileSystem.makeDirectoryAsync(parentDir(cachePath), { intermediates: true });
    const result = await FileSystem.downloadAsync(url, cachePath);
    return result.uri;
  }

  async delete(reference: string): Promise<void> {
    // Holistic + idempotent: remove the reference and its paired render/source,
    // in both remote storage and the local cache. Missing objects are ignored.
    const derived = derivedImagePath(reference);
    for (const r of new Set([reference, derived])) {
      try {
        await deleteObject(storageRef(getFirebaseStorage(), r));
      } catch {
        // already gone / never existed — idempotent
      }
      await FileSystem.deleteAsync(cachePathFor(r), { idempotent: true });
    }
  }

  async clearCache(surveyId?: string): Promise<void> {
    // Survey-scoped clearing covers survey-level media (e.g. boundary at
    // `surveys/{id}/…`). NOTE: location photos are stored under
    // `locations/{locationId}/…`, so they are not grouped by survey in the
    // storage path and are not removed by a surveyId-scoped clear; a full clear
    // (no argument) removes everything. See firebase/README.md.
    const dir = surveyId ? `${CACHE_ROOT}surveys/${surveyId}` : CACHE_ROOT;
    await FileSystem.deleteAsync(dir, { idempotent: true });
  }
}
