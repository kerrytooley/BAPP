import * as FileSystem from "expo-file-system/legacy";
import type { MediaResolver, ResolvedMedia } from "@bapp/export";
import { base64ToBytes } from "@utils/base64";

/** Resolves a media reference to a locally-available URI (file:// or data:). */
export type ResolveMediaUrl = (reference: string) => Promise<string>;

const MIME_BY_EXTENSION: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    heic: "image/heic",
};

/**
 * On-device {@link MediaResolver} for the survey export.
 *
 * Turns a report figure's `imageRef` into bytes by first asking the domain for a
 * locally-available URI (`SurveyService.getMediaUrl`), then decoding it:
 * - `data:` URIs are parsed directly (in-memory / already-embedded images).
 * - `file://` URIs are read as base64 via expo-file-system.
 *
 * Returns `null` (rather than throwing) when an image cannot be resolved so the
 * export still succeeds with that figure's base image simply omitted.
 */
export class ExpoMediaResolver implements MediaResolver {
    constructor(private readonly resolveUrl: ResolveMediaUrl) {}

    async resolve(imageRef: string): Promise<ResolvedMedia | null> {
        try {
            const url = await this.resolveUrl(imageRef);
            if (url.startsWith("data:")) return parseDataUri(url);
            return await this.readFile(url);
        } catch {
            return null;
        }
    }

    private async readFile(uri: string): Promise<ResolvedMedia> {
        const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
        });
        return { bytes: base64ToBytes(base64), mimeType: mimeFromUri(uri) };
    }
}

function parseDataUri(uri: string): ResolvedMedia | null {
    const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(uri);
    if (!match) return null;
    const mimeType = match[1] || "application/octet-stream";
    const isBase64 = Boolean(match[2]);
    const data = match[3];
    const bytes = isBase64
        ? base64ToBytes(data)
        : base64ToBytes(btoa(decodeURIComponent(data)));
    return { bytes, mimeType };
}

function mimeFromUri(uri: string): string {
    const clean = uri.split("?")[0].split("#")[0];
    const parts = clean.split(".");
    const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
    return MIME_BY_EXTENSION[ext] ?? "application/octet-stream";
}
