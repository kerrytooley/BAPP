/**
 * A stored media asset (boundary image, location front-view or equipment
 * photo), modelled to make the async upload→rasterize pipeline explicit and
 * reusable across every image in the app.
 *
 * `sourceRef` is what was uploaded (may be a PDF or HEIC); `renderRef` is the
 * displayable raster and is `null` until normalization/rasterization completes.
 * These live as fields on their parent document (survey or location) so their
 * transitions propagate to all devices via that document's subscription
 * (Firestore `onSnapshot`).
 */

/**
 * Lifecycle of a media asset, from upload to displayable.
 * - `uploading`  — source bytes are being uploaded (transient, device-local)
 * - `processing` — source stored; the displayable raster is being produced
 *                  (e.g. an async Cloud Function rasterizing a PDF or
 *                  transcoding a HEIC photo)
 * - `ready`      — `renderRef` points at a displayable raster
 * - `failed`     — upload or rasterization failed; `error` may explain
 */
export type MediaAssetStatus = 'uploading' | 'processing' | 'ready' | 'failed';

export interface MediaAsset {
  sourceRef: string;
  renderRef: string | null;
  status: MediaAssetStatus;
  error?: string | null;
  // TODO(media-fallback / Copilot C): add `fallbackRenderRef?: string | null` —
  // the previous `ready` render kept live while a replacement is still
  // `processing`, so replacing an image never blanks the existing one. See the
  // Option 2 note in SurveyService.setBoundaryImage. No persistence change needed
  // (this rides inside the nested doc map).
}

export type MediaType = 'equipment' | 'frontView' | 'boundary';
export type LocationImageType = 'equipment' | 'frontView';
