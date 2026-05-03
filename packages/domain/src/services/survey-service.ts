import type { SurveyRepository } from '../repositories/survey-repository';
import type { LocationRepository } from '../repositories/location-repository';
import type { SurveyorRepository } from '../repositories/surveyor-repository';
import type { ObservationRepository } from '../repositories/observation-repository';
import type { MediaRepository } from '../repositories/media-repository';

export class SurveyService {
  constructor(
    private readonly surveyRepository: SurveyRepository,
    private readonly locationRepository: LocationRepository,
    private readonly surveyorRepository: SurveyorRepository,
    private readonly observationRepository: ObservationRepository,
    private readonly mediaRepository: MediaRepository,
  ) {}

  // TODO: Admin journey
  // - createSurvey(): generate admin + surveyor codes, persist draft survey
  // - completeSurvey(surveyId): mark completed, trigger CSV export email

  // TODO: Surveyor journey
  // - joinSurvey(surveyorCode): look up survey by code
  // - declareSurveyor(surveyId, name): create/find surveyor, return surveyor + locations
  // - claimLocation(locationId, surveyorId): assign surveyor to location
  // - recordObservation(input): create observation at location
  // - updateObservation(id, input): partial update (last seen, counts, flight paths, etc.)
  // - markDone(surveyorId): set surveyor status to done
}
