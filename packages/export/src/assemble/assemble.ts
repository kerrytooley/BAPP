import type { SurveyContext } from '@bapp/domain';
import { normalizeReport } from '../model/normalize';
import { buildReportHtml, type ResolvedImage } from '../html/build-html';
import { buildReportWorkbook } from '../xlsx/build-xlsx';
import type { MediaResolver, Packager, PackFile } from './ports';

export const REPORT_HTML = 'flight-paths.html';
export const REPORT_XLSX = 'survey-data.xlsx';
export const MEDIA_DIR = 'media';

export interface AssembleOptions {
  mediaResolver: MediaResolver;
  packager: Packager;
}

export interface AssembleResult {
  /** The zip archive bytes. */
  zip: Uint8Array;
  /** The files placed in the archive (useful for logging/tests). */
  files: PackFile[];
}

/**
 * Assemble the full survey export archive from a raw `SurveyContext`.
 *
 * Pure orchestration: normalizes the context, resolves each figure's base image
 * via the {@link MediaResolver}, then builds `report.html` (with images inlined
 * as base64 for a self-contained, canvas-safe document) and `survey-data.xlsx`,
 * and drops the same base images loosely into `media/` as an offline fallback.
 * The {@link Packager} turns the file list into zip bytes.
 *
 * The archive layout:
 * ```
 * report.html          (interactive, images inlined base64)
 * survey-data.xlsx     (deep-links into report.html)
 * media/<figureId>.<ext>   (high-res base images, onerror fallback + safety net)
 * ```
 */
export async function assembleSurveyExport(
  context: SurveyContext,
  options: AssembleOptions,
): Promise<AssembleResult> {
  const model = normalizeReport(context);

  const resolvedImages = new Map<string, ResolvedImage>();
  const mediaFiles: PackFile[] = [];
  const figureIdByRef = new Map<string, string>();
  for (const figure of model.figures) {
    if (!figureIdByRef.has(figure.imageRef)) figureIdByRef.set(figure.imageRef, figure.figureId);
  }

  const refs = [...figureIdByRef.keys()];
  const resolved = await Promise.all(refs.map((ref) => options.mediaResolver.resolve(ref)));

  refs.forEach((ref, i) => {
    const media = resolved[i];
    if (!media) return;

    const mediaPath = `${MEDIA_DIR}/${figureIdByRef.get(ref)}.${extensionFor(media.mimeType)}`;
    resolvedImages.set(ref, {
      dataUri: `data:${media.mimeType};base64,${media.base64 ?? toBase64(media.bytes)}`,
      mediaPath,
    });
    mediaFiles.push({ path: mediaPath, data: media.bytes });
  });

  const html = buildReportHtml(model, resolvedImages);
  const xlsx = buildReportWorkbook(model, { reportHref: REPORT_HTML });

  const files: PackFile[] = [
    { path: REPORT_HTML, data: html },
    { path: REPORT_XLSX, data: xlsx },
    ...mediaFiles,
  ];

  const zip = await options.packager.pack(files);
  return { zip, files };
}

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

function extensionFor(mimeType: string): string {
  return EXTENSION_BY_MIME[mimeType] ?? 'bin';
}

/** Base64-encode bytes without relying on Node's `Buffer` (RN-safe). */
export function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  const CHUNK = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK) {
    parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK) as unknown as number[]));
  }
  // btoa exists in browsers and RN (Hermes via polyfill).
  return btoa(parts.join(''));
}
