import { describe, it, expect, vi, afterEach } from 'vitest';
import { SurveyService } from '../survey-service';
import { NoOpValidator } from '../../validation';
import type { SurveyExportRepository } from '../../repositories/survey-export-repository';
import { surveyContextFingerprint, type SurveyExport } from '../../models/survey-export';
import type { SurveyContext } from '../../survey-context';
import {
  InMemorySurveyRepository,
  InMemoryLocationRepository,
  InMemorySurveyorRepository,
  InMemoryObservationRepository,
  InMemoryMediaRepository,
} from '@bapp/repository';

class FakeExportRepository implements SurveyExportRepository {
  latest: SurveyExport | null = null;
  requests = 0;
  listeners: ((value: SurveyExport | null) => void)[] = [];
  unsubscribed = 0;
  emitOnSubscribe: SurveyExport | null = null;

  async getLatest(): Promise<SurveyExport | null> {
    return this.latest;
  }
  subscribeLatest(_surveyId: string, callback: (value: SurveyExport | null) => void) {
    this.listeners.push(callback);
    if (this.emitOnSubscribe) callback(this.emitOnSubscribe);
    return () => {
      this.unsubscribed++;
    };
  }
  async requestExport(): Promise<string> {
    this.requests++;
    return `req_${this.requests}`;
  }
  emit(value: SurveyExport | null) {
    for (const listener of this.listeners) listener(value);
  }
}

function exportRecord(overrides: Partial<SurveyExport> = {}): SurveyExport {
  return {
    status: 'ready',
    storagePath: 'surveys/s/reports/r/x.zip',
    fileName: 'x.zip',
    fingerprint: null,
    missingMedia: [],
    generatedAt: new Date(),
    lastRequestId: null,
    error: null,
    ...overrides,
  };
}

async function setup(withExports = true) {
  const locationRepo = new InMemoryLocationRepository();
  const surveyorRepo = new InMemorySurveyorRepository();
  const observationRepo = new InMemoryObservationRepository();
  const surveyRepo = new InMemorySurveyRepository(locationRepo, surveyorRepo, observationRepo);
  const exportRepo = new FakeExportRepository();
  const service = new SurveyService(
    surveyRepo, locationRepo, surveyorRepo, observationRepo, new InMemoryMediaRepository(),
    new NoOpValidator(), withExports ? exportRepo : undefined,
  );
  const survey = await service.createSurvey();
  const fingerprint = surveyContextFingerprint(await service.getSurveyContext(survey.id));
  return { service, exportRepo, surveyId: survey.id, fingerprint };
}

describe('SurveyService server export', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports support only when an export repository is wired', async () => {
    expect((await setup(true)).service.supportsServerExport()).toBe(true);
    const { service, surveyId } = await setup(false);
    expect(service.supportsServerExport()).toBe(false);
    await expect(service.getServerExport(surveyId)).rejects.toThrow('not available');
  });

  it('always asks the backend (it decides reuse), ignoring answers to other requests', async () => {
    const { service, exportRepo, surveyId, fingerprint } = await setup();
    // Even a seemingly current record is not trusted: local reads are cache-first.
    exportRepo.latest = exportRecord({ fingerprint });
    const result = service.getServerExport(surveyId);
    await vi.waitFor(() => expect(exportRepo.listeners).toHaveLength(1));
    expect(exportRepo.requests).toBe(1);

    exportRepo.emit(exportRecord({ lastRequestId: 'someone_else' }));
    exportRepo.emit(exportRecord({ lastRequestId: 'req_1', status: 'generating' }));
    const answer = exportRecord({ lastRequestId: 'req_1', fileName: 'new.zip' });
    exportRepo.emit(answer);

    await expect(result).resolves.toBe(answer);
    expect(exportRepo.unsubscribed).toBe(1);
  });

  it('fails fast without requesting when the backend is unreachable', async () => {
    const { service, exportRepo, surveyId } = await setup();
    exportRepo.getLatest = async () => {
      throw new Error('offline');
    };
    await expect(service.getServerExport(surveyId)).rejects.toThrow('offline');
    expect(exportRepo.requests).toBe(0);
  });

  it('rejects an answer that is missing media so the caller can build on device', async () => {
    const { service, exportRepo, surveyId } = await setup();
    const result = service.getServerExport(surveyId);
    await vi.waitFor(() => expect(exportRepo.listeners).toHaveLength(1));
    exportRepo.emit(exportRecord({ lastRequestId: 'req_1', missingMedia: ['a.png'] }));
    await expect(result).rejects.toThrow('missing media');
    expect(exportRepo.unsubscribed).toBe(1);
  });

  it('rejects when the backend reports the request failed', async () => {
    const { service, exportRepo, surveyId } = await setup();
    const result = service.getServerExport(surveyId);
    await vi.waitFor(() => expect(exportRepo.listeners).toHaveLength(1));
    exportRepo.emit(exportRecord({ lastRequestId: 'req_1', status: 'failed', error: 'boom' }));
    await expect(result).rejects.toThrow('boom');
  });

  it('settles when the subscription answers synchronously', async () => {
    const { service, exportRepo, surveyId } = await setup();
    exportRepo.emitOnSubscribe = exportRecord({ lastRequestId: 'req_1' });
    await expect(service.getServerExport(surveyId)).resolves.toBe(exportRepo.emitOnSubscribe);
    expect(exportRepo.unsubscribed).toBe(1);
  });

  it('rejects at once when the request is refused (e.g. rate-limited)', async () => {
    const { service, exportRepo, surveyId } = await setup();
    exportRepo.requestExport = async () => {
      throw new Error('permission-denied');
    };
    await expect(service.getServerExport(surveyId)).rejects.toThrow('permission-denied');
    expect(exportRepo.listeners).toHaveLength(0);
  });

  it('stops waiting and unsubscribes when aborted', async () => {
    const { service, exportRepo, surveyId } = await setup();
    const controller = new AbortController();
    const result = service.getServerExport(surveyId, { signal: controller.signal });
    await vi.waitFor(() => expect(exportRepo.listeners).toHaveLength(1));
    controller.abort();
    await expect(result).rejects.toThrow('cancelled');
    expect(exportRepo.unsubscribed).toBe(1);
  });

  it('does not request an export when already aborted', async () => {
    const { service, exportRepo, surveyId } = await setup();
    const controller = new AbortController();
    controller.abort();
    await expect(service.getServerExport(surveyId, { signal: controller.signal })).rejects.toThrow('cancelled');
    expect(exportRepo.requests).toBe(0);
  });

  it('times out when the request is never answered', async () => {
    const { service, exportRepo, surveyId } = await setup();
    vi.useFakeTimers();
    const result = service.getServerExport(surveyId, { timeoutMs: 1000 });
    const assertion = expect(result).rejects.toThrow('Timed out');
    await vi.waitFor(() => expect(exportRepo.listeners).toHaveLength(1));
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
    expect(exportRepo.unsubscribed).toBe(1);
  });
});

describe('surveyContextFingerprint', () => {
  it('changes when a record is added or edited', async () => {
    const { service, surveyId, fingerprint } = await setup();
    await service.addLocation(surveyId, { name: 'Barn' });
    const afterAdd = surveyContextFingerprint(await service.getSurveyContext(surveyId));
    expect(afterAdd).not.toBe(fingerprint);
  });

  it('detects an edit stamped earlier than the latest record (device clock behind)', async () => {
    const { service, surveyId } = await setup();
    const context = await service.getSurveyContext(surveyId);
    const at = (ms: number) => new Date(Date.UTC(2026, 9, 1) + ms);
    const withLocations = (stamps: number[]) => ({
      ...context,
      locations: stamps.map((ms, i) => ({ ...({} as SurveyContext['locations'][number]), id: `loc${i}`, updatedAt: at(ms) })),
    });
    // loc0 is edited on a device whose clock is behind loc1's timestamp: count and max are unchanged.
    expect(surveyContextFingerprint(withLocations([100, 1000]))).not.toBe(
      surveyContextFingerprint(withLocations([500, 1000])),
    );
  });

  it('does not depend on record order', async () => {
    const { service, surveyId } = await setup();
    await service.addLocation(surveyId, { name: 'Barn' });
    await service.addLocation(surveyId, { name: 'Shed' });
    const context = await service.getSurveyContext(surveyId);
    expect(surveyContextFingerprint({ ...context, locations: [...context.locations].reverse() })).toBe(
      surveyContextFingerprint(context),
    );
  });
});
