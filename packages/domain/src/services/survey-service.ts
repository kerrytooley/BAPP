import type { Survey, UpdateSurveyInput } from '../models/survey';
import type { Location, CreateLocationInput, UpdateLocationInput } from '../models/location';
import type { Surveyor, CreateSurveyorInput, UpdateSurveyorInput } from '../models/surveyor';
import type { Observation, CreateObservationInput, UpdateObservationInput } from '../models/observation';
import type { SurveyContext } from '../survey-context';
import type { SurveyRepository } from '../repositories/survey-repository';
import type { LocationRepository } from '../repositories/location-repository';
import type { SurveyorRepository } from '../repositories/surveyor-repository';
import type { ObservationRepository } from '../repositories/observation-repository';
import type { MediaRepository } from '../repositories/media-repository';
import type { SurveyValidator, SurveyChange } from '../validation';
import { ValidationError } from '../validation-error';

export class SurveyService {
  constructor(
    private readonly surveyRepository: SurveyRepository,
    private readonly locationRepository: LocationRepository,
    private readonly surveyorRepository: SurveyorRepository,
    private readonly observationRepository: ObservationRepository,
    private readonly mediaRepository: MediaRepository,
    private readonly validator: SurveyValidator,
  ) {}

  // --- Entry points ---

  async createSurvey(): Promise<Survey> {
    return this.surveyRepository.create({
      status: 'draft',
    });
  }

  async resumeSurvey(adminCode: string): Promise<SurveyContext> {
    const survey = await this.surveyRepository.findByAdminCode(adminCode);
    if (!survey) throw new Error('Survey not found for admin code');
    return this.surveyRepository.getSurveyContext(survey.id);
  }

  async joinSurvey(surveyorCode: string): Promise<SurveyContext> {
    const survey = await this.surveyRepository.findBySurveyorCode(surveyorCode);
    if (!survey) throw new Error('Survey not found for surveyor code');
    return this.surveyRepository.getSurveyContext(survey.id);
  }

  // --- Survey ---

  async getSurveyContext(surveyId: string): Promise<SurveyContext> {
    return this.surveyRepository.getSurveyContext(surveyId);
  }

  async updateSurvey(surveyId: string, input: UpdateSurveyInput): Promise<Survey> {
    await this.withContext(surveyId, { type: 'survey', surveyId }, (ctx) => {
      ctx.survey = { ...ctx.survey, ...input };
    });
    return this.surveyRepository.update(surveyId, input);
  }

  async completeSurvey(surveyId: string): Promise<Survey> {
    const ctx = await this.surveyRepository.getSurveyContext(surveyId);
    const notDone = ctx.surveyors.filter(s => s.status !== 'done');
    if (notDone.length > 0) {
      throw new ValidationError(
        `Cannot complete survey: ${notDone.length} surveyor(s) not done`,
      );
    }
    return this.surveyRepository.update(surveyId, { status: 'completed' });
  }

  // --- Locations ---

  async addLocation(surveyId: string, input: Omit<CreateLocationInput, 'surveyId'>): Promise<Location> {
    const location = await this.locationRepository.create({ surveyId, ...input });
    try {
      await this.withContext(surveyId, { type: 'location', locationId: location.id }, () => {});
      return location;
    } catch (e) {
      await this.locationRepository.delete(location.id);
      throw e;
    }
  }

  async updateLocation(locationId: string, input: UpdateLocationInput): Promise<Location> {
    const surveyId = await this.findSurveyId(this.locationRepository, locationId);
    await this.withContext(surveyId, { type: 'location', locationId }, (ctx) => {
      const idx = ctx.locations.findIndex(l => l.id === locationId);
      ctx.locations[idx] = { ...ctx.locations[idx], ...input };
    });
    return this.locationRepository.update(locationId, input);
  }

  async removeLocation(locationId: string): Promise<void> {
    const surveyId = await this.findSurveyId(this.locationRepository, locationId);
    const observations = await this.observationRepository.findByLocationId(locationId);
    if (observations.length > 0) {
      throw new ValidationError('Cannot delete location with existing observations');
    }
    const surveyors = await this.surveyorRepository.findBySurveyId(surveyId);
    if (surveyors.some(s => s.locationId === locationId)) {
      throw new ValidationError('Cannot delete location while a surveyor is assigned to it');
    }
    await this.locationRepository.delete(locationId);
  }

  // --- Surveyors ---

  async addSurveyor(surveyId: string, input: Omit<CreateSurveyorInput, 'surveyId'>): Promise<Surveyor> {
    const surveyor = await this.surveyorRepository.create({ surveyId, ...input });
    try {
      await this.withContext(surveyId, { type: 'surveyor', surveyorId: surveyor.id }, () => {});
      return surveyor;
    } catch (e) {
      await this.surveyorRepository.delete(surveyor.id);
      throw e;
    }
  }

  async updateSurveyor(surveyorId: string, input: UpdateSurveyorInput): Promise<Surveyor> {
    const surveyId = await this.findSurveyId(this.surveyorRepository, surveyorId);
    await this.withContext(surveyId, { type: 'surveyor', surveyorId }, (ctx) => {
      const idx = ctx.surveyors.findIndex(s => s.id === surveyorId);
      ctx.surveyors[idx] = { ...ctx.surveyors[idx], ...input };
    });
    return this.surveyorRepository.update(surveyorId, input);
  }

  async completeSurveyor(surveyorId: string): Promise<Surveyor> {
    return this.updateSurveyor(surveyorId, { status: 'done' });
  }

  async removeSurveyor(surveyorId: string): Promise<void> {
    const surveyId = await this.findSurveyId(this.surveyorRepository, surveyorId);
    const observations = await this.observationRepository.findBySurveyId(surveyId);
    if (observations.some(o => o.surveyorId === surveyorId)) {
      throw new ValidationError('Cannot delete surveyor with existing observations');
    }
    await this.surveyorRepository.delete(surveyorId);
  }

  // --- Observations ---

  async addObservation(input: CreateObservationInput): Promise<Observation> {
    const observation = await this.observationRepository.create(input);
    try {
      await this.withContext(input.surveyId, { type: 'observation', observationId: observation.id }, () => {});
      return observation;
    } catch (e) {
      await this.observationRepository.delete(observation.id);
      throw e;
    }
  }

  async updateObservation(observationId: string, input: UpdateObservationInput): Promise<Observation> {
    const surveyId = await this.findSurveyId(this.observationRepository, observationId);
    await this.withContext(surveyId, { type: 'observation', observationId }, (ctx) => {
      const idx = ctx.observations.findIndex(o => o.id === observationId);
      ctx.observations[idx] = { ...ctx.observations[idx], ...input };
    });
    return this.observationRepository.update(observationId, input);
  }

  async removeObservation(observationId: string): Promise<void> {
    await this.observationRepository.delete(observationId);
  }

  // --- Helpers ---

  private async withContext(
    surveyId: string,
    change: SurveyChange,
    applyToContext: (context: SurveyContext) => void,
  ): Promise<SurveyContext> {
    const context = await this.surveyRepository.getSurveyContext(surveyId);
    applyToContext(context);
    this.validator.validate(context, change);
    return context;
  }

  private async findSurveyId(
    repo: { findById(id: string): Promise<{ surveyId: string } | null> },
    id: string,
  ): Promise<string> {
    const entity = await repo.findById(id);
    if (!entity) throw new Error(`Entity ${id} not found`);
    return entity.surveyId;
  }
}
