import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemoryObservationRepository } from '../in-memory-observation-repository';

describe('InMemoryObservationRepository', () => {
  let repo: InMemoryObservationRepository;
  const surveyId = 'survey-1';
  const locationId = 'loc-1';
  const surveyorId = 'surveyor-1';

  beforeEach(() => {
    repo = new InMemoryObservationRepository();
  });

  describe('create', () => {
    it('creates an observation with defaults', async () => {
      const obs = await repo.create({ surveyId, locationId, surveyorId });
      expect(obs.id).toBeDefined();
      expect(obs.surveyId).toBe(surveyId);
      expect(obs.locationId).toBe(locationId);
      expect(obs.surveyorId).toBe(surveyorId);
      expect(obs.species).toBeNull();
      expect(obs.seenCount).toBe(0);
      expect(obs.heardCount).toBe(0);
      expect(obs.flightPaths).toEqual([]);
      expect(obs.data).toEqual({});
    });

    it('creates an observation with provided fields', async () => {
      const obs = await repo.create({
        surveyId,
        locationId,
        surveyorId,
        species: 'Common Pipistrelle',
        seenCount: 3,
        heardCount: 5,
        flightPaths: [{ id: 'fp-1', surface: 'frontView', points: [{ x: 0, y: 0 }, { x: 10, y: 20 }] }],
      });
      expect(obs.species).toBe('Common Pipistrelle');
      expect(obs.seenCount).toBe(3);
      expect(obs.heardCount).toBe(5);
      expect(obs.flightPaths).toHaveLength(1);
      expect(obs.flightPaths[0].points).toHaveLength(2);
    });
  });

  describe('findById', () => {
    it('returns the observation', async () => {
      const created = await repo.create({ surveyId, locationId, surveyorId, species: 'Noctule' });
      const found = await repo.findById(created.id);
      expect(found!.species).toBe('Noctule');
    });

    it('returns null for unknown ID', async () => {
      expect(await repo.findById('nope')).toBeNull();
    });
  });

  describe('findBySurveyId', () => {
    it('returns observations for a survey', async () => {
      await repo.create({ surveyId, locationId, surveyorId });
      await repo.create({ surveyId, locationId: 'loc-2', surveyorId });
      await repo.create({ surveyId: 'other', locationId, surveyorId });
      const results = await repo.findBySurveyId(surveyId);
      expect(results).toHaveLength(2);
    });
  });

  describe('findByLocationId', () => {
    it('returns observations for a location', async () => {
      await repo.create({ surveyId, locationId, surveyorId });
      await repo.create({ surveyId, locationId, surveyorId });
      await repo.create({ surveyId, locationId: 'loc-2', surveyorId });
      const results = await repo.findByLocationId(locationId);
      expect(results).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('updates counts and timestamps', async () => {
      const created = await repo.create({ surveyId, locationId, surveyorId, seenCount: 1 });
      const lastSeen = new Date('2026-06-15T22:31:00Z');
      const updated = await repo.update(created.id, {
        seenCount: 3,
        heardCount: 5,
        lastSeenAt: lastSeen,
      });
      expect(updated.seenCount).toBe(3);
      expect(updated.heardCount).toBe(5);
    });

    it('nulls optional fields', async () => {
      const created = await repo.create({ surveyId, locationId, surveyorId, notes: 'test' });
      const updated = await repo.update(created.id, { notes: null });
      expect(updated.notes).toBeNull();
    });

    it('updates flight paths', async () => {
      const created = await repo.create({ surveyId, locationId, surveyorId });
      const updated = await repo.update(created.id, {
        flightPaths: [
          { id: 'fp-1', surface: 'frontView', points: [{ x: 0, y: 0 }, { x: 5, y: 10 }] },
          { id: 'fp-2', surface: 'boundary', points: [{ x: 3, y: 3 }, { x: 8, y: 12 }] },
        ],
      });
      expect(updated.flightPaths).toHaveLength(2);
      expect(updated.flightPaths[0].surface).toBe('frontView');
      expect(updated.flightPaths[1].surface).toBe('boundary');
    });

    it('throws for unknown ID', async () => {
      await expect(repo.update('nope', { seenCount: 1 })).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('removes the observation', async () => {
      const created = await repo.create({ surveyId, locationId, surveyorId });
      await repo.delete(created.id);
      expect(await repo.findById(created.id)).toBeNull();
    });
  });

  describe('subscribeByLocationId', () => {
    it('fires immediately with current observations', async () => {
      await repo.create({ surveyId, locationId, surveyorId });
      const callback = vi.fn();
      repo.subscribeByLocationId(locationId, callback);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0]).toHaveLength(1);
    });

    it('fires on create', async () => {
      const callback = vi.fn();
      repo.subscribeByLocationId(locationId, callback);
      await repo.create({ surveyId, locationId, surveyorId });
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('fires on update', async () => {
      const created = await repo.create({ surveyId, locationId, surveyorId, seenCount: 0 });
      const callback = vi.fn();
      repo.subscribeByLocationId(locationId, callback);
      await repo.update(created.id, { seenCount: 5 });
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback.mock.calls[1][0][0].seenCount).toBe(5);
    });

    it('fires on delete', async () => {
      const created = await repo.create({ surveyId, locationId, surveyorId });
      const callback = vi.fn();
      repo.subscribeByLocationId(locationId, callback);
      await repo.delete(created.id);
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback.mock.calls[1][0]).toHaveLength(0);
    });

    it('stops after unsubscribe', async () => {
      const callback = vi.fn();
      const unsub = repo.subscribeByLocationId(locationId, callback);
      unsub();
      await repo.create({ surveyId, locationId, surveyorId });
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});
