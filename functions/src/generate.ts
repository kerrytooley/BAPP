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
  deleteZip(path: string): Promise<void>;
  store: ExportStore;
  newRunId(): string;
  now(): Date;
  logError(message: string, error: unknown): void;
}

export type GenerateOutcome = 'built' | 'reused' | 'failed';

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
    if (replaced && replaced !== storagePath) {
      await deps.deleteZip(replaced).catch((error) => deps.logError(`Failed to delete ${replaced}`, error));
    }
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
