import { describe, it, expect } from 'vitest';
import { SurveyService } from '../services/survey-service';
import { FieldValidator } from '../field-validator';
import { ValidationError } from '../validation-error';
import type { SurveyContext } from '../survey-context';
import type { Survey } from '../models/survey';
import type { Observation } from '../models/observation';
import {
    InMemorySurveyRepository,
    InMemoryLocationRepository,
    InMemorySurveyorRepository,
    InMemoryObservationRepository,
    InMemoryMediaRepository,
} from '@bapp/repository';

function createService() {
    const locationRepo = new InMemoryLocationRepository();
    const surveyorRepo = new InMemorySurveyorRepository();
    const observationRepo = new InMemoryObservationRepository();
    const surveyRepo = new InMemorySurveyRepository(locationRepo, surveyorRepo, observationRepo);
    return new SurveyService(
        surveyRepo, locationRepo, surveyorRepo, observationRepo, new InMemoryMediaRepository(),
        new FieldValidator(),
    );
}

async function setup() {
    const service = createService();
    const survey = await service.createSurvey();
    const location = await service.addLocation(survey.id, {});
    const surveyor = await service.addSurveyor(survey.id, {});
    const observation = await service.addObservation({
        surveyId: survey.id, locationId: location.id, surveyorId: surveyor.id,
    });
    return { service, survey, location, observation };
}

const weather = { temperature: '12', cloudCover: '50', humidity: '70', wind: '3', rain: 'Dry' };

describe('FieldValidator via SurveyService', () => {
    it('accepts valid start and end weather', async () => {
        const { service, survey } = await setup();
        await expect(service.updateSurvey(survey.id, { startWeather: weather })).resolves.toBeDefined();
        await expect(service.updateSurvey(survey.id, { endWeather: { ...weather, rain: '20' } })).resolves.toBeDefined();
    });

    it('rejects out-of-range weather', async () => {
        const { service, survey } = await setup();
        await expect(service.updateSurvey(survey.id, { startWeather: { ...weather, cloudCover: '150' } }))
            .rejects.toThrow(new ValidationError('Enter a value between 0 and 100'));
    });

    it('rejects start rain that is not Wet or Dry', async () => {
        const { service, survey } = await setup();
        await expect(service.updateSurvey(survey.id, { startWeather: { ...weather, rain: '20' } }))
            .rejects.toThrow('Choose Wet or Dry');
    });

    it('rejects a malformed postcode and an end time before the start time', async () => {
        const { service, survey } = await setup();
        await expect(service.updateSurvey(survey.id, { postcode: 'SW1A 1AA' })).resolves.toBeDefined();
        await expect(service.updateSurvey(survey.id, { postcode: 'SW1A-1AA!' }))
            .rejects.toThrow('Enter a valid UK postcode, e.g. SW1A 1AA');
        await expect(service.updateSurvey(survey.id, {
            startTime: new Date(2026, 0, 1, 21, 0),
            endTime: new Date(2026, 0, 1, 20, 0),
        })).rejects.toThrow('End time must be within 12 hours after the start time');
    });

    it('accepts a survey that crosses midnight', async () => {
        const { service, survey } = await setup();
        await expect(service.updateSurvey(survey.id, {
            startTime: new Date(2026, 0, 1, 22, 30),
            sunsetTime: new Date(2026, 0, 1, 23, 15),
            endTime: new Date(2026, 0, 1, 0, 45),
        })).resolves.toBeDefined();
    });

    it('rejects a sunrise/sunset time that is not between the start and end', async () => {
        const { service, survey } = await setup();
        await expect(service.updateSurvey(survey.id, {
            startTime: new Date(2026, 0, 1, 20, 0),
            sunsetTime: new Date(2026, 0, 1, 19, 0),
        })).rejects.toThrow('Sunrise/sunset time must be within 12 hours after the start time');
        await expect(service.updateSurvey(survey.id, {
            startTime: new Date(2026, 0, 1, 20, 0),
            sunsetTime: new Date(2026, 0, 1, 21, 0),
            endTime: new Date(2026, 0, 1, 20, 30),
        })).rejects.toThrow('End time must be after the sunrise/sunset time');
        await expect(service.updateSurvey(survey.id, {
            startTime: new Date(2026, 0, 1, 20, 0),
            sunsetTime: new Date(2026, 0, 1, 20, 15),
            endTime: new Date(2026, 0, 1, 22, 0),
        })).resolves.toBeDefined();
    });

    it('rejects a last seen time before the first seen time', async () => {
        const { service, observation } = await setup();
        await expect(service.updateObservation(observation.id, {
            firstSeenAt: new Date(2026, 0, 1, 20, 30),
            lastSeenAt: new Date(2026, 0, 1, 20, 0),
        })).rejects.toThrow("Last seen time can't be before the first seen time");
        await expect(service.updateObservation(observation.id, {
            firstSeenAt: new Date(2026, 0, 1, 20, 0),
            lastSeenAt: new Date(2026, 0, 1, 20, 30),
        })).resolves.toBeDefined();
    });

    it('rejects an invalid frequency and negative counts', async () => {
        const { service, observation } = await setup();
        await expect(service.updateObservation(observation.id, { frequency: 'loud' })).rejects.toThrow('Enter a number');
        await expect(service.updateObservation(observation.id, { seenCount: -1 })).rejects.toThrow(ValidationError);
        await expect(service.updateObservation(observation.id, { heardCount: 1.5 })).rejects.toThrow(ValidationError);
        await expect(service.updateObservation(observation.id, { frequency: '45', seenCount: 2 })).resolves.toBeDefined();
    });

    it('rejects blank location notes', async () => {
        const { service, location } = await setup();
        await expect(service.updateLocation(location.id, { notes: [{ text: '  ', time: new Date() }] }))
            .rejects.toThrow('Notes cannot be blank');
        await expect(service.updateLocation(location.id, { notes: [{ text: 'Lights on', time: new Date() }] }))
            .resolves.toBeDefined();
    });

    it('allows surveyor updates', async () => {
        const service = createService();
        const survey = await service.createSurvey();
        const surveyor = await service.addSurveyor(survey.id, { name: '' });
        await expect(service.updateSurveyor(surveyor.id, { name: 'Ada' })).resolves.toBeDefined();
    });
});

describe('FieldValidator scoping', () => {
    const badSurvey = {
        id: 's1',
        startWeather: { ...weather, temperature: 'hot' },
        endWeather: null,
    } as unknown as Survey;
    const badObservation = { id: 'o1', frequency: 'loud', seenCount: 0, heardCount: 0, flightPaths: [] } as unknown as Observation;
    const context = {
        survey: badSurvey,
        locations: [],
        surveyors: [],
        observations: [badObservation],
    } as unknown as SurveyContext;
    const validator = new FieldValidator();

    it('ignores pre-existing bad data in fields the update did not touch', () => {
        expect(() => validator.validate(context, { type: 'survey', surveyId: 's1', fields: ['status'] })).not.toThrow();
        expect(() => validator.validate(context, { type: 'observation', observationId: 'o1', fields: ['notes'] })).not.toThrow();
    });

    it('checks every field when no field list is given', () => {
        expect(() => validator.validate(context, { type: 'survey', surveyId: 's1' })).toThrow('Enter a number');
        expect(() => validator.validate(context, { type: 'observation', observationId: 'o1' })).toThrow('Enter a number');
    });

    it('ignores changes to entities missing from the context', () => {
        expect(() => validator.validate(context, { type: 'observation', observationId: 'missing' })).not.toThrow();
        expect(() => validator.validate(context, { type: 'location', locationId: 'missing' })).not.toThrow();
    });
});
