import type { Survey, CreateSurveyInput, UpdateSurveyInput } from '../models/survey';
import type { Location, CreateLocationInput, UpdateLocationInput } from '../models/location';
import type { Surveyor, CreateSurveyorInput, UpdateSurveyorInput } from '../models/surveyor';
import type { Observation, CreateObservationInput, UpdateObservationInput } from '../models/observation';
import type { SurveyContext } from '../survey-context';
import type { SurveyRepository } from '../repositories/survey-repository';
import type { LocationRepository } from '../repositories/location-repository';
import type { SurveyorRepository } from '../repositories/surveyor-repository';
import type { ObservationRepository } from '../repositories/observation-repository';
import type { MediaRepository } from '../repositories/media-repository';
import type { SurveyValidator } from '../validation';

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
    // TODO: generate admin + surveyor codes, persist draft survey
    throw new Error('Not implemented');
  }

  async resumeSurvey(adminCode: string): Promise<SurveyContext> {
    // TODO: look up survey by admin code, return full context
    throw new Error('Not implemented');
  }

  async joinSurvey(surveyorCode: string): Promise<SurveyContext> {
    // TODO: look up survey by surveyor code, return full context
    throw new Error('Not implemented');
  }

  // --- Survey ---

  async getSurveyContext(surveyId: string): Promise<SurveyContext> {
    // TODO: delegate to surveyRepository.getSurveyContext
    throw new Error('Not implemented');
  }

  async updateSurvey(surveyId: string, input: UpdateSurveyInput): Promise<Survey> {
    // TODO: fetch context, merge, validate, persist partial
    throw new Error('Not implemented');
  }

  async completeSurvey(surveyId: string): Promise<Survey> {
    // TODO: validate all surveyors done, transition to completed, trigger CSV export
    throw new Error('Not implemented');
  }

  // --- Locations ---

  async addLocation(surveyId: string, input: Omit<CreateLocationInput, 'surveyId'>): Promise<Location> {
    // TODO: create location, validate context
    throw new Error('Not implemented');
  }

  async updateLocation(locationId: string, input: UpdateLocationInput): Promise<Location> {
    // TODO: fetch context, merge, validate, persist partial
    throw new Error('Not implemented');
  }

  async removeLocation(locationId: string): Promise<void> {
    // TODO: check no observations reference this location, then delete
    throw new Error('Not implemented');
  }

  // --- Surveyors ---

  async addSurveyor(surveyId: string, input: Omit<CreateSurveyorInput, 'surveyId'>): Promise<Surveyor> {
    // TODO: create surveyor, validate context
    throw new Error('Not implemented');
  }

  async updateSurveyor(surveyorId: string, input: UpdateSurveyorInput): Promise<Surveyor> {
    // TODO: fetch context, merge, validate (e.g. unique locationId), persist partial
    throw new Error('Not implemented');
  }

  async completeSurveyor(surveyorId: string): Promise<Surveyor> {
    // TODO: set status to done, validate context
    throw new Error('Not implemented');
  }

  async removeSurveyor(surveyorId: string): Promise<void> {
    // TODO: check no observations reference this surveyor, then delete
    throw new Error('Not implemented');
  }

  // --- Observations ---

  async addObservation(input: CreateObservationInput): Promise<Observation> {
    // TODO: create observation, validate context
    throw new Error('Not implemented');
  }

  async updateObservation(observationId: string, input: UpdateObservationInput): Promise<Observation> {
    // TODO: fetch context, merge, validate, persist partial
    throw new Error('Not implemented');
  }

  async removeObservation(observationId: string): Promise<void> {
    // TODO: delete observation
    throw new Error('Not implemented');
  }
}
