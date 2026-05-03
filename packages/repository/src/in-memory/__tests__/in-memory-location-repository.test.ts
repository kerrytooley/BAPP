import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemoryLocationRepository } from '../in-memory-location-repository';

describe('InMemoryLocationRepository', () => {
  let repo: InMemoryLocationRepository;
  const surveyId = 'survey-1';

  beforeEach(() => {
    repo = new InMemoryLocationRepository();
  });

  describe('create', () => {
    it('creates a location with defaults', async () => {
      const loc = await repo.create({ surveyId });
      expect(loc.id).toBeDefined();
      expect(loc.surveyId).toBe(surveyId);
      expect(loc.name).toBeNull();
      expect(loc.boundaryPosition).toBeNull();
      expect(loc.frontViewImageRef).toBeNull();
      expect(loc.data).toEqual({});
    });

    it('creates a location with provided fields', async () => {
      const loc = await repo.create({
        surveyId,
        name: 'North Gate',
        boundaryPosition: { x: 10, y: 20 },
      });
      expect(loc.name).toBe('North Gate');
      expect(loc.boundaryPosition).toEqual({ x: 10, y: 20 });
    });
  });

  describe('findById', () => {
    it('returns the location', async () => {
      const created = await repo.create({ surveyId, name: 'Point A' });
      const found = await repo.findById(created.id);
      expect(found!.name).toBe('Point A');
    });

    it('returns null for unknown ID', async () => {
      expect(await repo.findById('nope')).toBeNull();
    });
  });

  describe('findBySurveyId', () => {
    it('returns locations for a survey', async () => {
      await repo.create({ surveyId, name: 'A' });
      await repo.create({ surveyId, name: 'B' });
      await repo.create({ surveyId: 'other', name: 'C' });
      const results = await repo.findBySurveyId(surveyId);
      expect(results).toHaveLength(2);
    });

    it('returns empty array for unknown survey', async () => {
      expect(await repo.findBySurveyId('nope')).toEqual([]);
    });
  });

  describe('update', () => {
    it('updates specified fields', async () => {
      const created = await repo.create({ surveyId, name: 'Old' });
      const updated = await repo.update(created.id, { name: 'New' });
      expect(updated.name).toBe('New');
    });

    it('nulls fields', async () => {
      const created = await repo.create({ surveyId, name: 'Has Name' });
      const updated = await repo.update(created.id, { name: null });
      expect(updated.name).toBeNull();
    });

    it('throws for unknown ID', async () => {
      await expect(repo.update('nope', { name: 'X' })).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('removes the location', async () => {
      const created = await repo.create({ surveyId });
      await repo.delete(created.id);
      expect(await repo.findById(created.id)).toBeNull();
    });
  });

  describe('subscribeBySurveyId', () => {
    it('fires immediately with current locations', async () => {
      await repo.create({ surveyId, name: 'A' });
      const callback = vi.fn();
      repo.subscribeBySurveyId(surveyId, callback);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0]).toHaveLength(1);
    });

    it('fires on create', async () => {
      const callback = vi.fn();
      repo.subscribeBySurveyId(surveyId, callback);
      await repo.create({ surveyId, name: 'New' });
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback.mock.calls[1][0]).toHaveLength(1);
    });

    it('fires on update', async () => {
      const created = await repo.create({ surveyId, name: 'Before' });
      const callback = vi.fn();
      repo.subscribeBySurveyId(surveyId, callback);
      await repo.update(created.id, { name: 'After' });
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback.mock.calls[1][0][0].name).toBe('After');
    });

    it('fires on delete', async () => {
      const created = await repo.create({ surveyId });
      const callback = vi.fn();
      repo.subscribeBySurveyId(surveyId, callback);
      await repo.delete(created.id);
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback.mock.calls[1][0]).toHaveLength(0);
    });

    it('stops after unsubscribe', async () => {
      const callback = vi.fn();
      const unsub = repo.subscribeBySurveyId(surveyId, callback);
      unsub();
      await repo.create({ surveyId });
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});
