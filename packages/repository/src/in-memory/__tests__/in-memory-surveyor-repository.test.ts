import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemorySurveyorRepository } from '../in-memory-surveyor-repository';

describe('InMemorySurveyorRepository', () => {
  let repo: InMemorySurveyorRepository;
  const surveyId = 'survey-1';

  beforeEach(() => {
    repo = new InMemorySurveyorRepository();
  });

  describe('create', () => {
    it('creates a surveyor with defaults', async () => {
      const s = await repo.create({ surveyId });
      expect(s.id).toBeDefined();
      expect(s.surveyId).toBe(surveyId);
      expect(s.locationId).toBeNull();
      expect(s.name).toBeNull();
      expect(s.isLead).toBe(false);
      expect(s.status).toBe('pending');
      expect(s.data).toEqual({});
    });

    it('creates a surveyor with provided fields', async () => {
      const s = await repo.create({ surveyId, name: 'Alice', isLead: true, status: 'ready', locationId: 'loc-1' });
      expect(s.name).toBe('Alice');
      expect(s.isLead).toBe(true);
      expect(s.status).toBe('ready');
      expect(s.locationId).toBe('loc-1');
    });
  });

  describe('findById', () => {
    it('returns the surveyor', async () => {
      const created = await repo.create({ surveyId, name: 'Bob' });
      const found = await repo.findById(created.id);
      expect(found!.name).toBe('Bob');
    });

    it('returns null for unknown ID', async () => {
      expect(await repo.findById('nope')).toBeNull();
    });
  });

  describe('findBySurveyId', () => {
    it('returns surveyors for a survey', async () => {
      await repo.create({ surveyId, name: 'A' });
      await repo.create({ surveyId, name: 'B' });
      await repo.create({ surveyId: 'other', name: 'C' });
      const results = await repo.findBySurveyId(surveyId);
      expect(results).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('updates specified fields', async () => {
      const created = await repo.create({ surveyId, name: 'Old' });
      const updated = await repo.update(created.id, { name: 'New', status: 'done', locationId: 'loc-2' });
      expect(updated.name).toBe('New');
      expect(updated.status).toBe('done');
      expect(updated.locationId).toBe('loc-2');
    });

    it('throws for unknown ID', async () => {
      await expect(repo.update('nope', { name: 'X' })).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('removes the surveyor', async () => {
      const created = await repo.create({ surveyId });
      await repo.delete(created.id);
      expect(await repo.findById(created.id)).toBeNull();
    });
  });

  describe('subscribeBySurveyId', () => {
    it('fires immediately with current surveyors', async () => {
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
