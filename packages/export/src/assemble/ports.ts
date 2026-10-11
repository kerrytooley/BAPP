/**
 * Ports for assembling a survey export. The assembler in `assemble.ts` is pure
 * and depends only on these interfaces; the concrete adapters (Expo media
 * resolution, zipping) are supplied by the caller so the same assembler runs in
 * Node tests and on-device.
 */

/** Base image bytes resolved from a `ReportFigure.imageRef`. */
export interface ResolvedMedia {
  bytes: Uint8Array;
  /** e.g. `image/png`, `image/jpeg`. Drives the data URI and file extension. */
  mimeType: string;
  /** Base64 of `bytes` when the platform already has it natively; skips a slow JS encode on Hermes. */
  base64?: string;
}

/**
 * Resolves a figure's `imageRef` to its bytes. Platform-specific (reads the
 * device cache / storage). Returns `null` when the image cannot be found so the
 * figure is simply emitted without an inlined base image.
 */
export interface MediaResolver {
  resolve(imageRef: string): Promise<ResolvedMedia | null>;
}

/** A single file to place in the export archive. */
export interface PackFile {
  path: string;
  data: string | Uint8Array;
}

/** Packs files into a zip archive and returns its bytes. */
export interface Packager {
  pack(files: PackFile[]): Promise<Uint8Array>;
}
