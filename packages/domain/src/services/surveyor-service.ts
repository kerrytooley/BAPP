// TODO: Implement surveyor journey business logic
//
// Responsibilities:
//   - Starting and completing sub-surveys (surveyor journey)
//   - Recording bat observations within a sub-survey

import type { SubSurveyRepository } from '../repositories/sub-survey-repository';

export class SurveyorService {
  constructor(
    private readonly subSurveyRepository: SubSurveyRepository,
  ) {}

  // TODO: startSubSurvey(subSurveyId: string, surveyorId: string): Promise<SubSurvey>
  // TODO: recordObservation(subSurveyId: string, input: CreateObservationInput): Promise<Observation>
  // TODO: completeSubSurvey(subSurveyId: string): Promise<SubSurvey>
}
