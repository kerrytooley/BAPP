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
import { isPdf, isHeic, needsNormalization, derivedImagePath, type Rasterizer } from './boundary-media';

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

/** Decode base64 back to bytes (inverse of `bytesToBase64`). Used to re-read
 *  cached media off disk when resuming an interrupted upload at launch. */
function base64ToBytes(b64: string): Uint8Array {
  const out = new Uint8Array(Math.floor((b64.replace(/=+$/, '').length * 6) / 8));
  let bits = 0;
  let value = 0;
  let o = 0;
  for (const ch of b64) {
    if (ch === '=') break;
    const idx = BASE64_CHARS.indexOf(ch);
    if (idx === -1) continue; // skip whitespace/newlines
    value = (value << 6) | idx;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (value >> bits) & 0xff;
    }
  }
  return out.subarray(0, o);
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

/**
 * Infer the content type from the bytes' magic number first, falling back to the
 * extension. `needsNormalization` deliberately detects PDF/HEIC from magic bytes
 * when the extension lies, so the stored metadata (and what a rasterizer receives)
 * must agree — inferring purely from a wrong extension would mislabel the object.
 */
function inferContentType(reference: string, bytes: Uint8Array): string {
  if (isPdf(reference, bytes)) return 'application/pdf';
  if (isHeic(reference, bytes)) return 'image/heic';
  return mimeTypeFor(reference);
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

/**
 * Reject references that could escape `CACHE_ROOT` when used as a filesystem
 * path. References are persisted in writable Firestore fields, so a malicious or
 * corrupt `../`/absolute/backslash reference must never be turned into a local
 * URI for download, cache seeding, or deletion. Fail closed.
 */
function assertSafeReference(reference: string): void {
  const unsafe =
    reference.length === 0 ||
    reference.startsWith('/') ||
    reference.includes('\\') ||
    reference.includes('\0') ||
    reference.split('/').some((segment) => segment === '..');
  if (unsafe) {
    throw new Error(`Unsafe media reference rejected: ${JSON.stringify(reference)}`);
  }
}

/** Root of the on-device offline cache. Mirrors storage ref paths beneath it so
 *  a reference maps 1:1 to a cache file and survey-scoped clearing is a dir delete. */
const CACHE_ROOT = `${FileSystem.cacheDirectory ?? ''}bapp-media/`;

/** Durable record of uploads that have not yet reached Storage, persisted next to
 *  the cached bytes so it survives app kills. Kept OUT of the survey-scoped cache
 *  subtree so `clearCache(surveyId)` never orphans it. */
const PENDING_MANIFEST_PATH = `${CACHE_ROOT}.pending-uploads.json`;

interface PendingUpload {
  contentType: string;
}

function cachePathFor(reference: string): string {
  assertSafeReference(reference);
  return `${CACHE_ROOT}${reference}`;
}

function parentDir(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash >= 0 ? path.slice(0, slash) : path;
}

/**
 * The full set of references a `delete(reference)` must remove: the reference
 * itself plus every paired artifact. `derivedImagePath` maps a source (`.pdf`/
 * `.heic`) to its canonical `.png` render. The reverse is ambiguous — a `.png`
 * render does not encode which source produced it — so when given a render we
 * also target the known normalization-source extensions at the same stem.
 * Deletion is idempotent, so targeting a non-existent variant is harmless.
 */
function deletionGroup(reference: string): string[] {
  const refs = new Set([reference, derivedImagePath(reference)]);
  if (/\.png$/i.test(reference)) {
    const stem = reference.replace(/\.[^./]*$/, '');
    for (const ext of ['pdf', 'heic', 'heif']) refs.add(`${stem}.${ext}`);
  }
  return [...refs];
}

export class FirebaseMediaRepository implements MediaRepository {
  /**
   * @param rasterizer Optional on-device rasterizer (client/hybrid). When
   *   provided, PDF/HEIC sources are rasterized locally so the originating
   *   device can draw them offline immediately. When omitted (e.g. local /
   *   emulator with no native lib), such sources fall back to server-deferred
   *   rasterization (`renderRef: null`, `status: 'processing'`) and offline
   *   drawing of PDF/HEIC is unavailable — see firebase/README.md.
   */
  constructor(private readonly rasterizer?: Rasterizer) {}

  /** Serializes read-modify-write access to the pending-uploads manifest. */
  private manifestLock: Promise<unknown> = Promise.resolve();

  async upload(
    path: string,
    data: ArrayBuffer | Uint8Array,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    const sourceRef = sanitizePath(path);
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    const contentType = options?.contentType ?? inferContentType(sourceRef, bytes);

    // Offline-first: persist the picked bytes to the local cache FIRST, keyed by
    // the storage ref, so the originating device can render this media from a
    // `file://` URI immediately — with no network round-trip and while fully
    // offline. `getDownloadUrl(sourceRef)` will hit this cache. This is what lets
    // a surveyor in the field add media and keep operating on it before (or
    // without) any upload.
    await this.seedCache(sourceRef, bytes);

    // Start the resumable upload but DO NOT await its completion (see
    // startBackgroundUpload). Resolving reflects "source recorded and locally
    // usable", not "bytes reached Storage" — the doc's eventually-consistent
    // write contract.
    this.startBackgroundUpload(sourceRef, bytes, contentType, options?.onProgress);

    if (needsNormalization(sourceRef, bytes)) {
      if (this.rasterizer) {
        // CLIENT/HYBRID rasterization (offline-first): produce the display-ready
        // raster on the originating device NOW, seed it into the cache so
        // getDownloadUrl(renderRef) hits offline, and upload it in the background
        // as the canonical copy other devices download. The origin device never
        // waits on the network or a server function to draw a PDF/HEIC.
        const render = await this.rasterizer.rasterize(bytes, contentType);
        const renderRef = derivedImagePath(sourceRef);
        await this.seedCache(renderRef, render.bytes);
        this.startBackgroundUpload(renderRef, render.bytes, render.contentType);
        return { sourceRef, renderRef, status: 'ready' };
      }
      // SERVER-DEFERRED fallback (no on-device rasterizer): a Cloud Function
      // rasterizes after the source lands and writes `renderRef` + `ready` back
      // onto the parent doc, which propagates via subscription. Offline PDF/HEIC
      // drawing is NOT available in this mode (no function runs against the bare
      // emulator either) — see firebase/README.md.
      return { sourceRef, renderRef: null, status: 'processing' };
    }

    // Already a renderable raster: source is its own render, and the originating
    // device draws it straight from the cache we just seeded — `ready` is honest
    // even offline (the `processing` status is a signal for OTHER devices).
    return { sourceRef, renderRef: sourceRef, status: 'ready' };
  }

  /** Write bytes into the on-device cache at the ref's mirrored path (offline-first). */
  private async seedCache(reference: string, bytes: Uint8Array): Promise<void> {
    const cachePath = cachePathFor(reference);
    await FileSystem.makeDirectoryAsync(parentDir(cachePath), { intermediates: true });
    await FileSystem.writeAsStringAsync(cachePath, bytesToBase64(bytes), {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  /**
   * Fire a resumable upload without awaiting it. Offline it cannot finish;
   * awaiting would hang the caller and block the surveyor. It runs/resumes in
   * the background and flushes when connectivity returns.
   *
   * Durability across app kills: before starting, the reference is recorded in a
   * persisted pending-uploads manifest and only cleared once the upload succeeds.
   * A terminal failure (or an app kill mid-flight) therefore leaves the entry in
   * place, so `resumePendingUploads()` at the next launch re-sends it from the
   * cached bytes — the source is never left as a durable doc reference pointing at
   * an object that never reached Storage.
   *
   * NOTE (device-time hardening): the bytes are also on disk in the cache, so
   * uploading via RNFB's `putFile(ref, cachePath)` is more robust than a byte
   * buffer; left as `uploadBytesResumable` because the input choice can only be
   * validated on a real device.
   */
  private startBackgroundUpload(
    reference: string,
    bytes: Uint8Array,
    contentType: string,
    onProgress?: (fraction: number) => void,
  ): void {
    // Record BEFORE starting so an app kill immediately after start is still
    // recoverable. Fire-and-forget: a local file write, ordered by manifestLock.
    void this.recordPending(reference, contentType);
    const task = uploadBytesResumable(
      storageRef(getFirebaseStorage(), reference),
      bytes,
      { contentType },
    );
    if (onProgress) {
      task.on('state_changed', (snapshot: FirebaseStorageTypes.TaskSnapshot) => {
        if (snapshot.totalBytes > 0) {
          onProgress(snapshot.bytesTransferred / snapshot.totalBytes);
        }
      });
    }
    task.then(
      () => {
        void this.clearPending(reference); // reached Storage — no longer pending
      },
      () => undefined, // leave the entry for launch-time resume
    );
  }

  /**
   * Re-enqueue every upload that had not reached Storage when the app last exited.
   * Call once at startup, after Firebase init. Entries whose cached bytes are gone
   * (e.g. the cache was cleared) are pruned rather than resent. Best-effort — a
   * still-offline device simply re-queues them again next launch.
   */
  async resumePendingUploads(): Promise<void> {
    const manifest = await this.readManifest();
    for (const [reference, entry] of Object.entries(manifest)) {
      const cachePath = cachePathFor(reference);
      const info = await FileSystem.getInfoAsync(cachePath);
      if (!info.exists) {
        await this.clearPending(reference);
        continue;
      }
      const b64 = await FileSystem.readAsStringAsync(cachePath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      this.startBackgroundUpload(reference, base64ToBytes(b64), entry.contentType);
    }
  }

  private async readManifest(): Promise<Record<string, PendingUpload>> {
    const info = await FileSystem.getInfoAsync(PENDING_MANIFEST_PATH);
    if (!info.exists) return {};
    try {
      return JSON.parse(await FileSystem.readAsStringAsync(PENDING_MANIFEST_PATH)) as Record<
        string,
        PendingUpload
      >;
    } catch {
      return {}; // corrupt/partial manifest — start clean rather than crash
    }
  }

  /** Atomically read-modify-write the manifest, serialized via `manifestLock`. */
  private mutateManifest(mutator: (manifest: Record<string, PendingUpload>) => void): Promise<void> {
    const next = this.manifestLock.then(async () => {
      const manifest = await this.readManifest();
      mutator(manifest);
      await FileSystem.makeDirectoryAsync(parentDir(PENDING_MANIFEST_PATH), { intermediates: true });
      await FileSystem.writeAsStringAsync(PENDING_MANIFEST_PATH, JSON.stringify(manifest));
    });
    this.manifestLock = next.catch(() => undefined); // keep the chain alive on failure
    return next;
  }

  private recordPending(reference: string, contentType: string): Promise<void> {
    return this.mutateManifest((manifest) => {
      manifest[reference] = { contentType };
    });
  }

  private clearPending(reference: string): Promise<void> {
    return this.mutateManifest((manifest) => {
      delete manifest[reference];
    });
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
    // Holistic + idempotent: remove the reference and every paired source/render
    // (see `deletionGroup`), in both remote storage and the local cache. Missing
    // objects are ignored. Each ref is also dropped from the pending-uploads
    // manifest so a not-yet-flushed upload can't be resurrected by the launch-time
    // resume sweep after its object was deleted here.
    for (const r of deletionGroup(reference)) {
      await this.clearPending(r);
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
