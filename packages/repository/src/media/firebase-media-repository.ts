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
    await task;

    // A PDF (or other non-renderable source) is rasterized asynchronously by a
    // Cloud Function, which writes `renderRef` + `status: 'ready'` back onto the
    // parent doc. Resolving here means only that the source is stored — so
    // return `processing` with no render yet. (No function runs against the bare
    // emulator, so the render stays pending in local dev — see firebase/README.)
    if (isPdf(sourceRef, bytes)) {
      return { sourceRef, renderRef: null, status: 'processing' };
    }
    // Already a renderable raster: source is its own render.
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
