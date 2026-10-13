import {
  isReadySurveyExport,
  surveyContextFingerprint,
  type MediaAsset,
  type SurveyContext,
  type SurveyExport,
} from '@bapp/domain';
import { assembleSurveyExport, exportFileName, JsZipPackager, type MediaResolver } from '@bapp/export';
import { reportsStoragePrefix } from '@bapp/repository/mapping';

export interface ExportStore {
  readLatest(surveyId: string): Promise<SurveyExport | null>;
  /**
   * Atomically replace the latest record with `update(current)` (left as is when
   * that returns null). `update` may run more than once if the record changes
   * concurrently. Resolves to the record it was given last.
   */
  updateLatest(
    surveyId: string,
    update: (current: SurveyExport | null) => SurveyExport | null,
  ): Promise<SurveyExport | null>;
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

/** `superseded`: a run that read the survey later had already published, so this one didn't. */
export type GenerateOutcome = 'built' | 'reused' | 'superseded' | 'failed';

/**
 * How long a replaced archive stays downloadable. A client may have been handed
 * its path just before a concurrent build replaced it, so it isn't deleted at once.
 */
export const ARCHIVE_RETENTION_MS = 60 * 60 * 1000;

/** Builds attempted when the survey keeps changing while it is being built. */
export const MAX_BUILD_ATTEMPTS = 3;

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
 *
 * Runs can overlap (completion and request triggers, concurrent requests), so a
 * run never replaces a ready record built from survey data read after its own
 * (`generatedAt` is when that data was read); it answers its request with that
 * newer record instead.
 */
export async function generateSurveyExport(
  surveyId: string,
  deps: GenerateDeps,
  requestId: string | null = null,
): Promise<GenerateOutcome> {
  const startedAt = deps.now();
  // Stamp this run's request on a record without otherwise changing it.
  const answer = (record: SurveyExport | null) =>
    record && requestId ? { ...record, lastRequestId: requestId } : null;
  try {
    let readAt = startedAt;
    const [loaded, latest] = await Promise.all([deps.loadContext(surveyId), deps.store.readLatest(surveyId)]);
    let context = loaded;
    let fingerprint = surveyContextFingerprint(context);

    if (isReadySurveyExport(latest) && latest.fingerprint === fingerprint && latest.missingMedia.length === 0) {
      if (requestId) await deps.store.updateLatest(surveyId, answer);
      return 'reused';
    }

    let built: { zip: Uint8Array; missingMedia: string[] };
    for (let attempt = 1; ; attempt++) {
      built = await buildArchive(context, deps.mediaResolver);
      // Recheck before publishing: if the survey changed while building, rebuild from the new data.
      const checkedAt = deps.now();
      const current = await deps.loadContext(surveyId);
      const currentFingerprint = surveyContextFingerprint(current);
      if (currentFingerprint === fingerprint || attempt >= MAX_BUILD_ATTEMPTS) break;
      [context, fingerprint, readAt] = [current, currentFingerprint, checkedAt];
    }

    const fileName = exportFileName(context.survey);
    const storagePath = `${reportsStoragePrefix(surveyId)}${deps.newRunId()}/${fileName}`;
    await deps.uploadZip(storagePath, built.zip, fileName);

    let published = false;
    const replaced = await deps.store.updateLatest(surveyId, (current) => {
      published = !readLater(current, readAt);
      if (!published) return answer(current);
      return {
        status: 'ready',
        storagePath,
        fileName,
        fingerprint,
        missingMedia: built.missingMedia,
        generatedAt: readAt,
        lastRequestId: requestId ?? current?.lastRequestId ?? null,
        error: null,
      };
    });
    const now = deps.now();
    // No longer latest: the archive this run replaced, or its own when a newer one was already published.
    const retired = published ? replaced?.storagePath : storagePath;
    if (retired && (retired !== storagePath || !published)) {
      await deps.retireZip(retired, now).catch((error) => deps.logError(`Failed to retire ${retired}`, error));
    }
    await deps
      .pruneRetiredZips(surveyId, new Date(now.getTime() - ARCHIVE_RETENTION_MS))
      .catch((error) => deps.logError(`Failed to prune archives for survey ${surveyId}`, error));
    return published ? 'built' : 'superseded';
  } catch (error) {
    deps.logError(`Export for survey ${surveyId} failed`, error);
    await deps.store.updateLatest(surveyId, (current) => {
      if (readLater(current, startedAt)) return answer(current);
      return {
        ...(current ?? EMPTY),
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        lastRequestId: requestId ?? current?.lastRequestId ?? null,
      };
    });
    return 'failed';
  }
}

/** Whether `record` is a ready export built from survey data read after `readAt`. */
function readLater(record: SurveyExport | null, readAt: Date): boolean {
  return isReadySurveyExport(record) && record.generatedAt != null && record.generatedAt > readAt;
}

async function buildArchive(context: SurveyContext, resolver: MediaResolver) {
  // The report leaves out media that isn't ready yet, so count it as missing too:
  // the archive is then rebuilt on request instead of being treated as complete.
  const missing = new Set(pendingMedia(context));
  const { zip } = await assembleSurveyExport(context, {
    mediaResolver: {
      resolve: async (ref) => {
        const media = await resolver.resolve(ref);
        if (!media) missing.add(ref);
        return media;
      },
    },
    packager: new JsZipPackager(),
  });
  return { zip, missingMedia: [...missing].sort() };
}

/**
 * Source refs of media still on its way to a displayable render. Failed media
 * is excluded: it never becomes ready, and an on-device build would omit it too.
 */
function pendingMedia(context: SurveyContext): string[] {
  const assets: (MediaAsset | null)[] = [
    context.survey.boundary,
    ...context.locations.flatMap((location) => [location.frontViewImage, location.equipmentImage]),
  ];
  return assets
    .filter((asset): asset is MediaAsset => asset != null && asset.status !== 'failed')
    .filter((asset) => asset.status !== 'ready' || !asset.renderRef)
    .map((asset) => asset.sourceRef);
}
