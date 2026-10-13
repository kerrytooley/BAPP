import { describe, it, expect, vi } from 'vitest';
import JSZip from 'jszip';
import {
  surveyContextFingerprint,
  type SurveyContext,
  type SurveyExport,
} from '@bapp/domain';
import type { ResolvedMedia } from '@bapp/export';
import { ARCHIVE_RETENTION_MS, MAX_BUILD_ATTEMPTS, generateSurveyExport, type GenerateDeps } from '../generate';

const EPOCH = new Date('2026-10-01T20:00:00.000Z');
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);

function context(): SurveyContext {
  return {
    survey: {
      id: 'svy', adminCode: 'A', surveyorCode: 'S', name: 'Willow Farm', postcode: 'GL7 5AB',
      date: EPOCH, sunsetTime: null, startTime: null, endTime: null,
      boundary: { sourceRef: 'b.png', renderRef: 'b.png', status: 'ready', error: null },
      status: 'completed', startWeather: null, endWeather: null, data: {}, createdAt: EPOCH, updatedAt: EPOCH,
    },
    locations: [{
      id: 'loc', surveyId: 'svy', name: 'Barn', boundaryPosition: null,
      frontViewImage: { sourceRef: 'f.jpg', renderRef: 'f.jpg', status: 'ready', error: null },
      equipmentImage: null, equipmentInformation: null, notes: null, data: {}, createdAt: EPOCH, updatedAt: EPOCH,
    }],
    surveyors: [],
    observations: [],
  };
}

function makeDeps(overrides: { latest?: SurveyExport | null; media?: Record<string, ResolvedMedia> } = {}) {
  const writes: SurveyExport[] = [];
  const uploads = new Map<string, Uint8Array>();
  const media = overrides.media ?? { 'b.png': { bytes: PNG, mimeType: 'image/png' } };
  const store = { latest: overrides.latest ?? null };
  const deps: GenerateDeps = {
    loadContext: vi.fn(async () => context()),
    mediaResolver: { resolve: async (ref) => media[ref] ?? null },
    uploadZip: vi.fn(async (path: string, zip: Uint8Array) => {
      uploads.set(path, zip);
    }),
    retireZip: vi.fn(async () => {}),
    pruneRetiredZips: vi.fn(async () => {}),
    store: {
      readLatest: async () => store.latest,
      updateLatest: vi.fn(async (_id: string, update: (current: SurveyExport | null) => SurveyExport | null) => {
        const current = store.latest;
        const next = update(current);
        if (next) {
          writes.push(next);
          store.latest = next;
        }
        return current;
      }),
    },
    newRunId: () => 'run1',
    now: () => EPOCH,
    logError: vi.fn(),
  };
  return { deps, writes, uploads, store };
}

function ready(overrides: Partial<SurveyExport> = {}): SurveyExport {
  return {
    status: 'ready', storagePath: 'surveys/svy/reports/old/x.zip', fileName: 'x.zip',
    fingerprint: surveyContextFingerprint(context()), missingMedia: [], generatedAt: EPOCH,
    lastRequestId: null, error: null, ...overrides,
  };
}

describe('generateSurveyExport', () => {
  it('builds, uploads and records the archive, noting media that is not uploaded yet', async () => {
    const { deps, writes, uploads } = makeDeps();
    expect(await generateSurveyExport('svy', deps, 'req1')).toBe('built');

    const path = 'surveys/svy/reports/run1/willow-farm-gl7-5ab-2026-10-01-results.zip';
    expect([...uploads.keys()]).toEqual([path]);
    expect(writes).toEqual([{
      status: 'ready', storagePath: path, fileName: 'willow-farm-gl7-5ab-2026-10-01-results.zip',
      fingerprint: surveyContextFingerprint(context()), missingMedia: ['f.jpg'], generatedAt: EPOCH,
      lastRequestId: 'req1', error: null,
    }]);

    const archive = await JSZip.loadAsync(uploads.get(path)!);
    const mediaBytes = await archive.file('media/boundary.png')!.async('uint8array');
    expect(Array.from(mediaBytes)).toEqual(Array.from(PNG));
  });

  it('retires the archive it replaced and prunes only those retired past the retention window', async () => {
    const { deps } = makeDeps({ latest: ready({ fingerprint: 'stale' }) });
    expect(await generateSurveyExport('svy', deps)).toBe('built');
    // Not deleted outright: a client may already hold its path.
    expect(deps.retireZip).toHaveBeenCalledWith('surveys/svy/reports/old/x.zip', EPOCH);
    expect(deps.pruneRetiredZips).toHaveBeenCalledWith(
      'svy',
      new Date(EPOCH.getTime() - ARCHIVE_RETENTION_MS),
    );
  });

  it('still reports a build when archive cleanup fails', async () => {
    const { deps } = makeDeps({ latest: ready({ fingerprint: 'stale' }) });
    deps.retireZip = vi.fn(async () => {
      throw new Error('retire');
    });
    deps.pruneRetiredZips = vi.fn(async () => {
      throw new Error('prune');
    });
    expect(await generateSurveyExport('svy', deps)).toBe('built');
    expect(deps.logError).toHaveBeenCalledTimes(2);
  });

  it('reuses a current archive, only stamping the request id', async () => {
    const latest = ready();
    const { deps, writes } = makeDeps({ latest });
    expect(await generateSurveyExport('svy', deps, 'req2')).toBe('reused');
    expect(deps.uploadZip).not.toHaveBeenCalled();
    expect(deps.retireZip).not.toHaveBeenCalled();
    expect(writes).toEqual([{ ...latest, lastRequestId: 'req2' }]);
  });

  it('reuses without writing when there is no request to answer', async () => {
    const { deps, writes } = makeDeps({ latest: ready() });
    expect(await generateSurveyExport('svy', deps)).toBe('reused');
    expect(writes).toEqual([]);
  });

  it('rebuilds a current archive that was missing media', async () => {
    const { deps } = makeDeps({ latest: ready({ missingMedia: ['f.jpg'] }) });
    expect(await generateSurveyExport('svy', deps)).toBe('built');
  });

  it('counts media that is not ready yet as missing, so the archive is not treated as complete', async () => {
    const { deps, writes } = makeDeps({ media: { 'b.png': { bytes: PNG, mimeType: 'image/png' }, 'f.jpg': { bytes: PNG, mimeType: 'image/jpeg' } } });
    const processing = context();
    processing.locations[0].frontViewImage = { sourceRef: 'f.heic', renderRef: null, status: 'processing', error: null };
    processing.locations[0].equipmentImage = { sourceRef: 'e.heic', renderRef: null, status: 'failed', error: 'bad' };
    deps.loadContext = vi.fn(async () => processing);

    expect(await generateSurveyExport('svy', deps, 'req1')).toBe('built');
    // A failed asset will never be ready, so it does not hold the export back.
    expect(writes.at(-1)?.missingMedia).toEqual(['f.heic']);
  });

  it('rebuilds from the new data when the survey changes while building', async () => {
    const { deps, writes, uploads } = makeDeps();
    const edited = context();
    edited.survey.updatedAt = new Date(EPOCH.getTime() + 1000);
    deps.loadContext = vi.fn()
      .mockResolvedValueOnce(context())
      .mockResolvedValue(edited);

    expect(await generateSurveyExport('svy', deps)).toBe('built');
    expect(deps.loadContext).toHaveBeenCalledTimes(3);
    expect(uploads.size).toBe(1);
    expect(writes.at(-1)?.fingerprint).toBe(surveyContextFingerprint(edited));
  });

  it('publishes after a bounded number of rebuilds when the survey keeps changing', async () => {
    const { deps, writes } = makeDeps();
    let version = 0;
    deps.loadContext = vi.fn(async () => {
      const changing = context();
      changing.survey.updatedAt = new Date(EPOCH.getTime() + ++version);
      return changing;
    });
    expect(await generateSurveyExport('svy', deps)).toBe('built');
    expect(deps.loadContext).toHaveBeenCalledTimes(1 + MAX_BUILD_ATTEMPTS);
    expect(writes).toHaveLength(1);
  });

  it('does not replace an export built from newer data, answering the request with it instead', async () => {
    const newer = ready({ fingerprint: 'newer', storagePath: 'surveys/svy/reports/new/x.zip', generatedAt: new Date(EPOCH.getTime() + 1) });
    const { deps, writes, store } = makeDeps({ latest: ready({ fingerprint: 'stale' }) });
    // A concurrent run that read the survey later publishes while this one is uploading.
    deps.uploadZip = vi.fn(async () => {
      store.latest = newer;
    });

    expect(await generateSurveyExport('svy', deps, 'req4')).toBe('superseded');
    expect(writes).toEqual([{ ...newer, lastRequestId: 'req4' }]);
    expect(deps.retireZip).toHaveBeenCalledWith(
      'surveys/svy/reports/run1/willow-farm-gl7-5ab-2026-10-01-results.zip',
      EPOCH,
    );
  });

  it('does not let a late failure replace an export built from newer data', async () => {
    const newer = ready({ fingerprint: 'newer', generatedAt: new Date(EPOCH.getTime() + 1) });
    const { deps, writes, store } = makeDeps({ latest: ready({ fingerprint: 'stale' }) });
    deps.uploadZip = vi.fn(async () => {
      store.latest = newer;
      throw new Error('quota');
    });

    expect(await generateSurveyExport('svy', deps)).toBe('failed');
    expect(writes).toEqual([]);
    expect(store.latest).toBe(newer);
  });

  it('records failures against the request without throwing', async () => {
    const { deps, writes } = makeDeps({ latest: ready({ fingerprint: 'stale' }) });
    deps.uploadZip = vi.fn(async () => {
      throw new Error('quota');
    });
    expect(await generateSurveyExport('svy', deps, 'req3')).toBe('failed');
    expect(writes).toEqual([
      ready({ fingerprint: 'stale', status: 'failed', error: 'quota', lastRequestId: 'req3' }),
    ]);
    expect(deps.logError).toHaveBeenCalled();
  });
});
