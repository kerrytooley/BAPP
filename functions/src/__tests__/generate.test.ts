import { describe, it, expect, vi } from 'vitest';
import JSZip from 'jszip';
import {
  surveyContextFingerprint,
  type SurveyContext,
  type SurveyExport,
} from '@bapp/domain';
import type { ResolvedMedia } from '@bapp/export';
import { ARCHIVE_RETENTION_MS, generateSurveyExport, type GenerateDeps } from '../generate';

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
  const deps: GenerateDeps = {
    loadContext: vi.fn(async () => context()),
    mediaResolver: { resolve: async (ref) => media[ref] ?? null },
    uploadZip: vi.fn(async (path: string, zip: Uint8Array) => {
      uploads.set(path, zip);
    }),
    retireZip: vi.fn(async () => {}),
    pruneRetiredZips: vi.fn(async () => {}),
    store: {
      readLatest: async () => overrides.latest ?? null,
      writeLatest: vi.fn(async (_id: string, value: SurveyExport) => {
        const previous = writes.at(-1)?.storagePath ?? overrides.latest?.storagePath ?? null;
        writes.push(value);
        return previous;
      }),
    },
    newRunId: () => 'run1',
    now: () => EPOCH,
    logError: vi.fn(),
  };
  return { deps, writes, uploads };
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
