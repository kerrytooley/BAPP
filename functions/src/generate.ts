import {
  isReadySurveyExport,
  surveyContextFingerprint,
  type SurveyContext,
  type SurveyExport,
} from '@bapp/domain';
import { assembleSurveyExport, exportFileName, JsZipPackager, type MediaResolver } from '@bapp/export';
import { reportsStoragePrefix } from '@bapp/repository/mapping';

export interface ExportStore {
  readLatest(surveyId: string): Promise<SurveyExport | null>;
  /** Replace the latest record; resolves to the `storagePath` it replaced, if any. */
  writeLatest(surveyId: string, value: SurveyExport): Promise<string | null>;
}

export interface GenerateDeps {
  loadContext(surveyId: string): Promise<SurveyContext>;
  mediaResolver: MediaResolver;
  uploadZip(path: string, zip: Uint8Array, fileName: string): Promise<void>;
  /** Mark an archive as no longer latest (it stays downloadable until pruned). */
  retireZip(path: string, retiredAt: Date): Promise<void>;
  /** Delete the survey's archives that were retired before `cutoff`. */
  pruneRetiredZips(surveyId: string, cutoff: Date): Promise<void>;
  store: ExportStore;
  newRunId(): string;
  now(): Date;
  logError(message: string, error: unknown): void;
}

export type GenerateOutcome = 'built' | 'reused' | 'failed';

/**
 * How long a replaced archive stays downloadable. A client may have been handed
 * its path just before a concurrent build replaced it, so it isn't deleted at once.
 */
export const ARCHIVE_RETENTION_MS = 60 * 60 * 1000;

const EMPTY: SurveyExport = {
  status: 'failed',
  storagePath: null,
  fileName: null,
  fingerprint: null,
  missingMedia: [],
  generatedAt: null,
  lastRequestId: null,
  error: null,
};

/**
 * Build (or reuse) the survey's export archive and record it as the latest.
 * `requestId` is echoed back as `lastRequestId` so the requesting client knows
 * its request was answered. Never throws: failures are recorded on the record.
 */
export async function generateSurveyExport(
  surveyId: string,
  deps: GenerateDeps,
  requestId: string | null = null,
): Promise<GenerateOutcome> {
  let latest: SurveyExport | null = null;
  try {
    const [context, current] = await Promise.all([
      deps.loadContext(surveyId),
      deps.store.readLatest(surveyId),
    ]);
    latest = current;
    const lastRequestId = requestId ?? latest?.lastRequestId ?? null;
    const fingerprint = surveyContextFingerprint(context);

    if (isReadySurveyExport(latest) && latest.fingerprint === fingerprint && latest.missingMedia.length === 0) {
      if (requestId) await deps.store.writeLatest(surveyId, { ...latest, lastRequestId });
      return 'reused';
    }

    const missingMedia: string[] = [];
    const { zip } = await assembleSurveyExport(context, {
      mediaResolver: {
        resolve: async (ref) => {
          const media = await deps.mediaResolver.resolve(ref);
          if (!media) missingMedia.push(ref);
          return media;
        },
      },
      packager: new JsZipPackager(),
    });

    const fileName = exportFileName(context.survey);
    const storagePath = `${reportsStoragePrefix(surveyId)}${deps.newRunId()}/${fileName}`;
    await deps.uploadZip(storagePath, zip, fileName);

    const replaced = await deps.store.writeLatest(surveyId, {
      status: 'ready',
      storagePath,
      fileName,
      fingerprint,
      missingMedia: missingMedia.sort(),
      generatedAt: deps.now(),
      lastRequestId,
      error: null,
    });
    const now = deps.now();
    if (replaced && replaced !== storagePath) {
      await deps.retireZip(replaced, now).catch((error) => deps.logError(`Failed to retire ${replaced}`, error));
    }
    await deps
      .pruneRetiredZips(surveyId, new Date(now.getTime() - ARCHIVE_RETENTION_MS))
      .catch((error) => deps.logError(`Failed to prune archives for survey ${surveyId}`, error));
    return 'built';
  } catch (error) {
    deps.logError(`Export for survey ${surveyId} failed`, error);
    await deps.store.writeLatest(surveyId, {
      ...(latest ?? EMPTY),
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
      lastRequestId: requestId ?? latest?.lastRequestId ?? null,
    });
    return 'failed';
  }
}
