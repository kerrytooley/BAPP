import type { SurveyContext } from '../survey-context';

export type SurveyExportStatus = 'generating' | 'ready' | 'failed';

/** The latest backend-built export archive for a survey. */
export interface SurveyExport {
  status: SurveyExportStatus;
  /** Storage reference of the zip; set once `ready`. */
  storagePath: string | null;
  fileName: string | null;
  /** {@link surveyContextFingerprint} of the data the archive was built from. */
  fingerprint: string | null;
  /** Image refs that could not be fetched when building (e.g. still uploading). */
  missingMedia: string[];
  generatedAt: Date | null;
  /** Id of the last export request this record answers. */
  lastRequestId: string | null;
  error: string | null;
}

export type ReadySurveyExport = SurveyExport & { status: 'ready'; storagePath: string; fileName: string };

export function isReadySurveyExport(value: SurveyExport | null): value is ReadySurveyExport {
  return value?.status === 'ready' && value.storagePath != null && value.fileName != null;
}

/**
 * Change detector for a survey's data: a hash over every record's id and
 * `updatedAt`. Any add, delete or edit changes it — including edits stamped by a
 * device whose clock is behind (`updatedAt` is client time, so a "latest
 * `updatedAt`" check would miss them).
 */
export function surveyContextFingerprint(context: SurveyContext): string {
  const versions = (items: { id: string; updatedAt: Date }[]) =>
    items.map((item) => `${item.id}@${item.updatedAt.getTime()}`).sort().join(',');
  const canonical = [
    `${context.survey.id}@${context.survey.updatedAt.getTime()}`,
    versions(context.locations),
    versions(context.surveyors),
    versions(context.observations),
  ].join('|');
  return `v2:${hash53(canonical)}`;
}

/** cyrb53: fast, well-distributed 53-bit string hash (not cryptographic). */
function hash53(value: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < value.length; i++) {
    const ch = value.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
