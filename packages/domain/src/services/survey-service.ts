// TODO: Implement survey management business logic
//
// Responsibilities:
//   - Creating and managing surveys (admin journey)
//   - Inviting surveyors to sub-surveys
//   - Completing surveys and triggering CSV email export

import type { SurveyRepository } from '../repositories/survey-repository';
import type { SubSurveyRepository } from '../repositories/sub-survey-repository';

export class SurveyService {
  constructor(
    private readonly surveyRepository: SurveyRepository,
    private readonly subSurveyRepository: SubSurveyRepository,
  ) {}

  // TODO: createSurvey(adminId: string, input: CreateSurveyInput): Promise<Survey>
  // TODO: inviteSurveyor(surveyId: string, surveyorEmail: string): Promise<SubSurvey>
  // TODO: completeSurvey(surveyId: string): Promise<void> — triggers CSV email to admin
}
