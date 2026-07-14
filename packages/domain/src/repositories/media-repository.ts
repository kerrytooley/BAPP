/**
 * Port for storing and retrieving media (boundary images, location photos).
 *
 * The adapter owns all format, storage-layout, and async knowledge:
 * - It decides the storage path (callers pass a logical path/role, not a bucket
 *   layout) and sanitizes file names.
 * - It normalizes non-renderable sources (PDF, HEIC) into a displayable raster
 *   image. `upload` therefore returns an `UploadResult` describing both what was
 *   stored (`sourceRef`) and the displayable output (`renderRef`), which may not
 *   exist yet if rasterization is asynchronous (e.g. a Cloud Function).
 * - `getDownloadUrl` returns a *locally-available* URI (see below), so callers
 *   can rely on it working offline.
 */

export type MediaStatus = 'processing' | 'ready';

export interface UploadResult {
  /** Reference to the exact bytes that were stored. Exists once `upload` resolves. */
  sourceRef: string;
  /**
   * Reference to the displayable raster image. `null` while the adapter is
   * still rasterizing asynchronously; callers should treat `status` as the
   * source of truth and re-resolve when it becomes `ready`.
   */
  renderRef: string | null;
  /** `ready` once `renderRef` is resolvable; `processing` while rasterizing. */
  status: MediaStatus;
}

export interface UploadOptions {
  /**
   * Progress callback for resumable uploads, reported as a fraction in [0,1].
   * Adapters that upload atomically may call this once with 1, or not at all.
   */
  onProgress?: (fraction: number) => void;
  /**
   * Explicit content type for the stored source. If omitted, the adapter infers
   * it from the path/bytes. The adapter is always responsible for setting the
   * correct content type on any derived (rasterized) output.
   */
  contentType?: string;
}

export interface MediaRepository {
  /**
   * Store `data` at (an adapter-decided path derived from) `path`, normalizing
   * non-renderable sources into a displayable raster. Resolving means "the
   * source is stored" — NOT necessarily "the render is ready"; inspect the
   * returned `status`.
   */
  upload(
    path: string,
    data: ArrayBuffer | Uint8Array,
    options?: UploadOptions,
  ): Promise<UploadResult>;

  /**
   * Resolve a reference to a locally-available URI the app can render offline.
   * Implementations check a local cache first and download on miss. The result
   * is a `file://` path (native) or `data:` URL (in-memory fake) — never a bare
   * remote `https://` URL, which would be useless offline.
   *
   * Throws only for a genuinely unknown reference; callers that expect a
   * possibly-not-yet-ready render should gate on `MediaStatus` before calling.
   */
  getDownloadUrl(reference: string): Promise<string>;

  /**
   * Delete a media group: the given reference and every artifact derived from
   * or paired with it (e.g. a boundary PDF's source alongside its rasterized
   * PNG). Best-effort and idempotent — safe to call on already-deleted refs.
   */
  delete(reference: string): Promise<void>;

  /**
   * Clear the local (offline) cache. With `surveyId`, clears only that survey's
   * cached media; without it, clears everything. Does not touch remote storage.
   */
  clearCache(surveyId?: string): Promise<void>;
}
