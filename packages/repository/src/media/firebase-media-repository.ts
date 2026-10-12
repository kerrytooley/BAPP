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

/** Root of the on-device display cache. Mirrors storage ref paths beneath it so
 *  a reference maps 1:1 to a cache file and survey-scoped clearing is a dir delete.
 *
 *  Lives under `cacheDirectory` (the OS may evict it under storage pressure).
 *  That is fine for re-downloadable display copies: `getDownloadUrl` is
 *  cache-first, so an evicted image simply re-downloads from Storage when online
 *  (and degrades to "unavailable" offline). Anything that can't be re-downloaded
 *  — unsent uploads — lives under `PENDING_ROOT` instead. */
const CACHE_ROOT = `${FileSystem.cacheDirectory ?? ''}bapp-media/`;

/** Durable copies of uploads that have not yet reached Storage, plus their
 *  manifest. Under `documentDirectory`, which the OS never evicts, so an unsent
 *  photo survives storage pressure as well as app kills; and outside `CACHE_ROOT`,
 *  so `clearCache()` can never drop one. Mirrors storage ref paths like the cache.
 *  Each copy is deleted as soon as its upload reaches Storage. */
const PENDING_ROOT = `${FileSystem.documentDirectory ?? ''}bapp-pending-uploads/`;
const PENDING_MANIFEST_PATH = `${PENDING_ROOT}manifest.json`;

/** Where the manifest lived before pending uploads moved out of the cache.
 *  Read once at launch so uploads queued by an older build are not lost. */
const LEGACY_MANIFEST_PATH = `${CACHE_ROOT}.pending-uploads.json`;

interface PendingUpload {
  contentType: string;
}

function cachePathFor(reference: string): string {
  assertSafeReference(reference);
  return `${CACHE_ROOT}${reference}`;
}

function pendingPathFor(reference: string): string {
  assertSafeReference(reference);
  return `${PENDING_ROOT}${reference}`;
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

  /** De-dupes concurrent `getDownloadUrl` calls for the same reference: the first
   *  starts the network fetch, the rest await the same promise instead of each
   *  firing their own getDownloadURL + download. Cleared on settle so a later
   *  call (e.g. after a cache clear) fetches afresh. */
  private inFlightDownloads = new Map<string, Promise<string>>();

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
   * Durability across app kills and cache eviction: the just-seeded cache copy is
   * duplicated under `PENDING_ROOT` and recorded in the pending-uploads manifest;
   * both are cleared only once the upload succeeds. A terminal failure (or an app
   * kill mid-flight) therefore leaves the entry in place, so
   * `resumePendingUploads()` at the next launch re-sends it from the durable copy —
   * the source is never left as a durable doc reference pointing at an object that
   * never reached Storage. Pass `alreadyPersisted` when re-sending from that copy.
   *
   * NOTE (device-time hardening): the bytes are also on disk in the cache, so
   * uploading via RNFB's `putFile(ref, cachePath)` is more robust than a byte
   * buffer; left as `uploadBytesResumable` because the input choice can only be
   * validated on a real device.
   *
   * TODO(upload-task-tracking / Copilot A4 & A5): tasks are fired and forgotten,
   * so two operations on the SAME reference can interleave with no ordering
   * guarantee:
   *   - A4 (re-upload race): replacing an asset with a file that sanitizes to the
   *     same ref (e.g. re-picking a same-named boundary PDF) starts a second task
   *     to the same path; if the older task flushes last it overwrites the
   *     canonical remote bytes with stale content while the doc/cache show the new
   *     image.
   *   - A5 (delete-vs-upload race): `delete()` can remove an object while its
   *     upload is still in flight (or before it exists); the task then finalizes
   *     and resurrects the supposedly-deleted object.
   * Fix: keep a `Map<reference, UploadTask>` of in-flight tasks; before starting a
   * new upload for a reference, cancel (`task.cancel()`) and await/clear any prior
   * task for that same reference, and have `delete()` cancel + await the group's
   * in-flight tasks before deleting. Remove the entry on settle. Low priority:
   * camera photos get unique names (no collision) and boundary same-name
   * re-upload is uncommon; the doc reference stays consistent either way.
   */
  private startBackgroundUpload(
    reference: string,
    bytes: Uint8Array,
    contentType: string,
    onProgress?: (fraction: number) => void,
    alreadyPersisted = false,
  ): void {
    // Persist alongside the upload so an app kill after start is still
    // recoverable. Fire-and-forget: local file writes, the manifest part ordered
    // by manifestLock. A failed persist must not block the upload itself.
    const persisted = (alreadyPersisted ? Promise.resolve() : this.persistPending(reference, contentType))
      .catch(() => undefined);
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
        // Reached Storage — no longer pending. Wait for the persist so its late
        // copy/record can't land after (and outlive) this cleanup.
        void persisted.then(() => this.settlePending(reference));
      },
      () => undefined, // leave the entry for launch-time resume
    );
  }

  /** Copy the cached bytes to durable storage, then record them in the manifest
   *  (so the manifest only ever names complete copies). */
  private async persistPending(reference: string, contentType: string): Promise<void> {
    const pendingPath = pendingPathFor(reference);
    await FileSystem.makeDirectoryAsync(parentDir(pendingPath), { intermediates: true });
    await FileSystem.copyAsync({ from: cachePathFor(reference), to: pendingPath });
    await this.recordPending(reference, contentType);
  }

  private async settlePending(reference: string): Promise<void> {
    await this.clearPending(reference);
    await FileSystem.deleteAsync(pendingPathFor(reference), { idempotent: true });
  }

  /**
   * Re-enqueue every upload that had not reached Storage when the app last exited.
   * Call once at startup, after Firebase init. Entries whose durable copy is gone
   * are pruned rather than resent. A display copy the OS evicted is restored from
   * the durable one, so this device can keep showing the image offline.
   * Best-effort — a still-offline device simply re-queues them again next launch.
   */
  async resumePendingUploads(): Promise<void> {
    await this.adoptLegacyPendingUploads();
    const manifest = await this.readManifest(PENDING_MANIFEST_PATH);
    for (const [reference, entry] of Object.entries(manifest)) {
      const pendingPath = pendingPathFor(reference);
      if (!(await FileSystem.getInfoAsync(pendingPath)).exists) {
        await this.clearPending(reference);
        continue;
      }
      const cachePath = cachePathFor(reference);
      if (!(await FileSystem.getInfoAsync(cachePath)).exists) {
        await FileSystem.makeDirectoryAsync(parentDir(cachePath), { intermediates: true });
        await FileSystem.copyAsync({ from: pendingPath, to: cachePath });
      }
      const b64 = await FileSystem.readAsStringAsync(pendingPath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      this.startBackgroundUpload(reference, base64ToBytes(b64), entry.contentType, undefined, true);
    }
  }

  /** One-off migration for uploads queued by a build that kept them in the cache:
   *  move any whose bytes survived into durable storage, then drop the old manifest. */
  private async adoptLegacyPendingUploads(): Promise<void> {
    const legacy = await this.readManifest(LEGACY_MANIFEST_PATH);
    for (const [reference, entry] of Object.entries(legacy)) {
      if ((await FileSystem.getInfoAsync(cachePathFor(reference))).exists) {
        await this.persistPending(reference, entry.contentType);
      }
    }
    await FileSystem.deleteAsync(LEGACY_MANIFEST_PATH, { idempotent: true });
  }

  private async readManifest(path: string): Promise<Record<string, PendingUpload>> {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return {};
    try {
      return JSON.parse(await FileSystem.readAsStringAsync(path)) as Record<string, PendingUpload>;
    } catch {
      return {}; // corrupt/partial manifest — start clean rather than crash
    }
  }

  /** Atomically read-modify-write the manifest, serialized via `manifestLock`. */
  private mutateManifest(mutator: (manifest: Record<string, PendingUpload>) => void): Promise<void> {
    const next = this.manifestLock.then(async () => {
      const manifest = await this.readManifest(PENDING_MANIFEST_PATH);
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
    if (info.exists) return info.uri; // cache hit — instant, no network

    // Cache miss: hit the network. De-dupe concurrent callers for the same
    // reference behind a single in-flight promise so we run one getDownloadURL +
    // download, not N. The network path fails fast offline (rather than hanging
    // ~2 min) because Storage's retry times are lowered in firebase-app.ts.
    const existing = this.inFlightDownloads.get(reference);
    if (existing) return existing;

    const download = (async () => {
      // Resolve the remote URL, download into the cache, return the local file://
      // URI so the caller can render it offline afterwards.
      const url = await getDownloadURL(storageRef(getFirebaseStorage(), reference));
      await FileSystem.makeDirectoryAsync(parentDir(cachePath), { intermediates: true });
      const result = await FileSystem.downloadAsync(url, cachePath);
      return result.uri;
    })();
    this.inFlightDownloads.set(reference, download);
    try {
      return await download;
    } finally {
      this.inFlightDownloads.delete(reference);
    }
  }

  async delete(reference: string): Promise<void> {
    // Holistic + idempotent: remove the reference and every paired source/render
    // (see `deletionGroup`), in both remote storage and the local cache. Missing
    // objects are ignored. Each ref is also dropped from the pending-uploads
    // manifest (and its durable copy removed) so a not-yet-flushed upload can't be
    // resurrected by the launch-time resume sweep after its object was deleted here.
    for (const r of deletionGroup(reference)) {
      await this.settlePending(r);
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
    // (no argument) removes everything. See firebase/README.md. Either way only
    // display copies go: unsent uploads live under PENDING_ROOT and are untouched.
    const dir = surveyId ? `${CACHE_ROOT}surveys/${surveyId}` : CACHE_ROOT;
    await FileSystem.deleteAsync(dir, { idempotent: true });
  }
}
