// Media-normalization conventions for repository adapters. Keeps
// PDF/HEIC/rasterization knowledge out of the domain so each backend can fulfil
// it differently (in-memory collapses synchronously; Firebase rasterizes on the
// originating device and/or via a server writeback — see the Rasterizer seam).

// Detects a PDF by extension or the `%PDF` magic number.
export function isPdf(pathOrName: string, bytes?: Uint8Array): boolean {
    if (/\.pdf$/i.test(pathOrName)) return true;
    if (!bytes) return false;
    return (
        bytes.length >= 4 &&
        bytes[0] === 0x25 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x44 &&
        bytes[3] === 0x46
    );
}

// ISO-BMFF major brands that denote HEIF/HEIC images (heic photos, iOS Live
// Photos, image sequences). Used for magic-number detection when the extension
// is absent or lying.
const HEIC_BRANDS = new Set([
    'heic', 'heix', 'heim', 'heis', 'heif', 'hevc', 'hevm', 'hevs', 'mif1', 'msf1',
]);

// Detects a HEIC/HEIF image by extension or the ISO-BMFF `ftyp` box + brand.
// HEIC does not render reliably via `<Image>` on Android, so it is a
// normalization-needing source (transcode to a display-ready raster), not an
// identity passthrough.
export function isHeic(pathOrName: string, bytes?: Uint8Array): boolean {
    if (/\.hei[cf]$/i.test(pathOrName)) return true;
    if (!bytes || bytes.length < 12) return false;
    const ftyp =
        bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70; // 'ftyp'
    if (!ftyp) return false;
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    return HEIC_BRANDS.has(brand);
}

// True for any source that is NOT directly renderable by `<Image>` and must be
// normalized to a raster (PDF → rasterize page 0; HEIC → transcode). PNG/JPEG/
// WebP/GIF are directly renderable and pass through unchanged (identity).
//
// NOTE (deferred): multi-page PDF handling. Page count is not reliably derivable
// from a cheap magic-number check (object streams can hide page objects), so it
// is NOT detected here. The Rasterizer implementation (which actually parses the
// PDF on-device) is where a multi-page source must FAIL CLEARLY rather than
// silently drop pages — see DESIGN-boundary-media-and-flight-paths.md (c).2.
export function needsNormalization(pathOrName: string, bytes?: Uint8Array): boolean {
    return isPdf(pathOrName, bytes) || isHeic(pathOrName, bytes);
}

// Path a normalization-needing source is rasterized to: same path with a `.png`
// extension. The canonical render is always a PNG, so delete-group pairing
// (source + render) is a stable, format-independent mapping.
export function derivedImagePath(path: string): string {
    return path.replace(/\.[^.]*$/, '') + '.png';
}

/** The display-ready raster produced from a normalization-needing source. */
export interface RasterizeResult {
    /** Raster bytes (canonically PNG — see `derivedImagePath`). */
    bytes: Uint8Array;
    /** Content type of the produced raster, e.g. `image/png`. */
    contentType: string;
}

/**
 * On-device rasterizer seam (client/hybrid rasterization).
 *
 * Per DESIGN-boundary-media-and-flight-paths.md (lines 414-430), offline-first
 * use of a PDF/HEIC source REQUIRES rasterizing on the originating device: a
 * server-only Cloud Function means a freshly-picked PDF boundary is not drawable
 * offline until it round-trips. An injected `Rasterizer` lets the Firebase
 * adapter produce a local raster immediately (drawn offline now), with the
 * server render as the canonical copy other devices download.
 *
 * This interface is the seam; the concrete native implementation (a real PDF
 * renderer / HEIC transcoder) is a device-time dependency and is intentionally
 * NOT provided here. When no rasterizer is injected, the adapter falls back to
 * server-deferred rasterization (`renderRef: null`, `status: 'processing'`) and
 * offline drawing of PDF/HEIC sources is unavailable in that mode.
 */
export interface Rasterizer {
    rasterize(bytes: Uint8Array, sourceContentType: string): Promise<RasterizeResult>;
}
