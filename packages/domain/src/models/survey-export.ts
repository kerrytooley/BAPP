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
 * Cheap change detector for a survey's data: record counts plus latest
 * `updatedAt` per collection. Deletions change a count; edits bump `updatedAt`.
 */
export function surveyContextFingerprint(context: SurveyContext): string {
  const latest = (items: { updatedAt: Date }[]) =>
    items.reduce((max, item) => Math.max(max, item.updatedAt.getTime()), 0);
  return [
    context.survey.updatedAt.getTime(),
    context.locations.length,
    latest(context.locations),
    context.surveyors.length,
    latest(context.surveyors),
    context.observations.length,
    latest(context.observations),
  ].join(':');
}
