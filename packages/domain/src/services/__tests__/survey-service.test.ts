import { describe, it, expect, vi } from 'vitest';
import { SurveyService } from '../survey-service';
import { NoOpValidator } from '../../validation';
import { ValidationError } from '../../validation-error';
import type { SurveyContext } from '../../survey-context';
import type { SurveyChange, SurveyValidator } from '../../validation';
import {
  InMemorySurveyRepository,
  InMemoryLocationRepository,
  InMemorySurveyorRepository,
  InMemoryObservationRepository,
  InMemoryMediaRepository,
} from '@bapp/repository';

function createService(validator?: SurveyValidator) {
  const locationRepo = new InMemoryLocationRepository();
  const surveyorRepo = new InMemorySurveyorRepository();
  const observationRepo = new InMemoryObservationRepository();
  const mediaRepo = new InMemoryMediaRepository();
  const surveyRepo = new InMemorySurveyRepository(locationRepo, surveyorRepo, observationRepo);
  const service = new SurveyService(
    surveyRepo, locationRepo, surveyorRepo, observationRepo, mediaRepo,
    validator ?? new NoOpValidator(),
  );
  return { service, surveyRepo, locationRepo, surveyorRepo, observationRepo };
}

describe('SurveyService', () => {
  describe('createSurvey', () => {
    it('creates a draft survey with codes', async () => {
      const { service } = createService();
      const survey = await service.createSurvey();
      expect(survey.id).toBeDefined();
      expect(survey.adminCode).toBeDefined();
      expect(survey.surveyorCode).toBeDefined();
      expect(survey.status).toBe('draft');
    });

    it('generates unique codes per survey', async () => {
      const { service } = createService();
      const s1 = await service.createSurvey();
      const s2 = await service.createSurvey();
      expect(s1.adminCode).not.toBe(s2.adminCode);
      expect(s1.surveyorCode).not.toBe(s2.surveyorCode);
    });
  });

  describe('resumeSurvey', () => {
    it('returns full context by admin code', async () => {
      const { service } = createService();
      const survey = await service.createSurvey();
      const ctx = await service.resumeSurvey(survey.adminCode);
      expect(ctx.survey.id).toBe(survey.id);
      expect(ctx.locations).toEqual([]);
      expect(ctx.surveyors).toEqual([]);
      expect(ctx.observations).toEqual([]);
    });

    it('throws for unknown admin code', async () => {
      const { service } = createService();
      await expect(service.resumeSurvey('badcode')).rejects.toThrow();
    });
  });

  describe('joinSurvey', () => {
    it('returns full context by surveyor code', async () => {
      const { service } = createService();
      const survey = await service.createSurvey();
      const ctx = await service.joinSurvey(survey.surveyorCode);
      expect(ctx.survey.id).toBe(survey.id);
    });

    it('throws for unknown surveyor code', async () => {
      const { service } = createService();
      await expect(service.joinSurvey('badcode')).rejects.toThrow();
    });
  });

  describe('getSurveyContext', () => {
    it('returns full context with all child entities', async () => {
      const { service } = createService();
      const survey = await service.createSurvey();
      await service.addLocation(survey.id, { name: 'A' });
      await service.addSurveyor(survey.id, { name: 'Alice' });

      const ctx = await service.getSurveyContext(survey.id);
      expect(ctx.survey.id).toBe(survey.id);
      expect(ctx.locations).toHaveLength(1);
      expect(ctx.surveyors).toHaveLength(1);
    });
  });

  describe('updateSurvey', () => {
    it('updates survey fields', async () => {
      const { service } = createService();
      const survey = await service.createSurvey();
      const updated = await service.updateSurvey(survey.id, { name: 'Bat Survey', postcode: 'SW1A 1AA' });
      expect(updated.name).toBe('Bat Survey');
      expect(updated.postcode).toBe('SW1A 1AA');
    });

    it('calls validator with merged context', async () => {
      const validate = vi.fn();
      const validator: SurveyValidator = { validate };
      const { service } = createService(validator);
      const survey = await service.createSurvey();
      await service.updateSurvey(survey.id, { name: 'New Name' });
      expect(validate).toHaveBeenCalledTimes(1);
      const [ctx, change] = validate.mock.calls[0];
      expect(ctx.survey.name).toBe('New Name');
      expect(change).toEqual({ type: 'survey', surveyId: survey.id });
    });

    it('rejects if validator throws', async () => {
      const validator: SurveyValidator = {
        validate() { throw new ValidationError('bad'); },
      };
      const { service } = createService(validator);
      const survey = await service.createSurvey();
      await expect(service.updateSurvey(survey.id, { name: 'X' })).rejects.toThrow('bad');
    });
  });

  describe('completeSurvey', () => {
    it('completes when all surveyors are done', async () => {
      const { service } = createService();
      const survey = await service.createSurvey();
      const s1 = await service.addSurveyor(survey.id, { name: 'Alice' });
      const s2 = await service.addSurveyor(survey.id, { name: 'Bob' });
      await service.completeSurveyor(s1.id);
      await service.completeSurveyor(s2.id);
      const completed = await service.completeSurvey(survey.id);
      expect(completed.status).toBe('completed');
    });

    it('completes when there are no surveyors', async () => {
      const { service } = createService();
      const survey = await service.createSurvey();
      const completed = await service.completeSurvey(survey.id);
      expect(completed.status).toBe('completed');
    });

    it('throws if any surveyor is not done', async () => {
      const { service } = createService();
      const survey = await service.createSurvey();
      await service.addSurveyor(survey.id, { name: 'Alice' });
      await expect(service.completeSurvey(survey.id)).rejects.toThrow(ValidationError);
    });
  });

  describe('addLocation', () => {
    it('creates a location on the survey', async () => {
      const { service } = createService();
      const survey = await service.createSurvey();
      const loc = await service.addLocation(survey.id, { name: 'North Gate' });
      expect(loc.surveyId).toBe(survey.id);
      expect(loc.name).toBe('North Gate');
    });

    it('rolls back if validator rejects', async () => {
      const validator: SurveyValidator = {
        validate(_ctx: SurveyContext, change: SurveyChange) {
          if (change.type === 'location') throw new ValidationError('no locations');
        },
      };
      const { service, locationRepo } = createService(validator);
      const survey = await service.createSurvey();
      await expect(service.addLocation(survey.id, { name: 'X' })).rejects.toThrow('no locations');
      const locations = await locationRepo.findBySurveyId(survey.id);
      expect(locations).toHaveLength(0);
    });
  });

  describe('updateLocation', () => {
    it('updates location fields', async () => {
      const { service } = createService();
      const survey = await service.createSurvey();
      const loc = await service.addLocation(survey.id, { name: 'Old' });
      const updated = await service.updateLocation(loc.id, { name: 'New' });
      expect(updated.name).toBe('New');
    });
  });

  describe('removeLocation', () => {
    it('deletes a location with no references', async () => {
      const { service, locationRepo } = createService();
      const survey = await service.createSurvey();
      const loc = await service.addLocation(survey.id, {});
      await service.removeLocation(loc.id);
      expect(await locationRepo.findById(loc.id)).toBeNull();
    });

    it('throws if observations reference the location', async () => {
      const { service } = createService();
      const survey = await service.createSurvey();
      const loc = await service.addLocation(survey.id, {});
      const surveyor = await service.addSurveyor(survey.id, {});
      await service.addObservation({ surveyId: survey.id, locationId: loc.id, surveyorId: surveyor.id });
      await expect(service.removeLocation(loc.id)).rejects.toThrow(ValidationError);
    });

    it('throws if a surveyor is assigned to the location', async () => {
      const { service } = createService();
      const survey = await service.createSurvey();
      const loc = await service.addLocation(survey.id, {});
      await service.addSurveyor(survey.id, { locationId: loc.id });
      await expect(service.removeLocation(loc.id)).rejects.toThrow(ValidationError);
    });
  });

  describe('addSurveyor', () => {
    it('creates a surveyor on the survey', async () => {
      const { service } = createService();
      const survey = await service.createSurvey();
      const surveyor = await service.addSurveyor(survey.id, { name: 'Alice', isLead: true });
      expect(surveyor.surveyId).toBe(survey.id);
      expect(surveyor.name).toBe('Alice');
      expect(surveyor.isLead).toBe(true);
      expect(surveyor.status).toBe('pending');
    });
  });

  describe('updateSurveyor', () => {
    it('updates surveyor fields', async () => {
      const { service } = createService();
      const survey = await service.createSurvey();
      const surveyor = await service.addSurveyor(survey.id, { name: 'Old' });
      const updated = await service.updateSurveyor(surveyor.id, { name: 'New', locationId: 'loc-1' });
      expect(updated.name).toBe('New');
      expect(updated.locationId).toBe('loc-1');
    });
  });

  describe('completeSurveyor', () => {
    it('sets surveyor status to done', async () => {
      const { service } = createService();
      const survey = await service.createSurvey();
      const surveyor = await service.addSurveyor(survey.id, { name: 'Alice' });
      const completed = await service.completeSurveyor(surveyor.id);
      expect(completed.status).toBe('done');
    });
  });

  describe('removeSurveyor', () => {
    it('deletes a surveyor with no observations', async () => {
      const { service, surveyorRepo } = createService();
      const survey = await service.createSurvey();
      const surveyor = await service.addSurveyor(survey.id, {});
      await service.removeSurveyor(surveyor.id);
      expect(await surveyorRepo.findById(surveyor.id)).toBeNull();
    });

    it('throws if observations reference the surveyor', async () => {
      const { service } = createService();
      const survey = await service.createSurvey();
      const loc = await service.addLocation(survey.id, {});
      const surveyor = await service.addSurveyor(survey.id, {});
      await service.addObservation({ surveyId: survey.id, locationId: loc.id, surveyorId: surveyor.id });
      await expect(service.removeSurveyor(surveyor.id)).rejects.toThrow(ValidationError);
    });
  });

  describe('addObservation', () => {
    it('creates an observation', async () => {
      const { service } = createService();
      const survey = await service.createSurvey();
      const loc = await service.addLocation(survey.id, {});
      const surveyor = await service.addSurveyor(survey.id, {});
      const obs = await service.addObservation({
        surveyId: survey.id,
        locationId: loc.id,
        surveyorId: surveyor.id,
        species: 'Common Pipistrelle',
        seenCount: 3,
        heardCount: 5,
      });
      expect(obs.species).toBe('Common Pipistrelle');
      expect(obs.seenCount).toBe(3);
      expect(obs.heardCount).toBe(5);
    });
  });

  describe('updateObservation', () => {
    it('updates observation fields', async () => {
      const { service } = createService();
      const survey = await service.createSurvey();
      const loc = await service.addLocation(survey.id, {});
      const surveyor = await service.addSurveyor(survey.id, {});
      const obs = await service.addObservation({
        surveyId: survey.id, locationId: loc.id, surveyorId: surveyor.id,
      });
      const updated = await service.updateObservation(obs.id, {
        seenCount: 5,
        lastSeenAt: new Date('2026-06-15T22:31:00Z'),
        flightPaths: [{ id: 'fp-1', points: [{ x: 0, y: 0 }, { x: 10, y: 20 }] }],
      });
      expect(updated.seenCount).toBe(5);
      expect(updated.flightPaths).toHaveLength(1);
    });

    it('calls validator with merged observation in context', async () => {
      const validate = vi.fn();
      const validator: SurveyValidator = { validate };
      const { service } = createService(validator);
      const survey = await service.createSurvey();
      const loc = await service.addLocation(survey.id, {});
      const surveyor = await service.addSurveyor(survey.id, {});
      const obs = await service.addObservation({
        surveyId: survey.id, locationId: loc.id, surveyorId: surveyor.id, seenCount: 1,
      });
      validate.mockClear();
      await service.updateObservation(obs.id, { seenCount: 10 });
      expect(validate).toHaveBeenCalledTimes(1);
      const [ctx, change] = validate.mock.calls[0];
      const updatedObs = ctx.observations.find((o: { id: string }) => o.id === obs.id);
      expect(updatedObs.seenCount).toBe(10);
      expect(change).toEqual({ type: 'observation', observationId: obs.id });
    });
  });

  describe('removeObservation', () => {
    it('deletes an observation', async () => {
      const { service, observationRepo } = createService();
      const survey = await service.createSurvey();
      const loc = await service.addLocation(survey.id, {});
      const surveyor = await service.addSurveyor(survey.id, {});
      const obs = await service.addObservation({
        surveyId: survey.id, locationId: loc.id, surveyorId: surveyor.id,
      });
      await service.removeObservation(obs.id);
      expect(await observationRepo.findById(obs.id)).toBeNull();
    });
  });
});
