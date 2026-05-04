import type { SurveyContext } from './survey-context';

export type SurveyChange =
  | { type: 'survey'; surveyId: string }
  | { type: 'location'; locationId: string }
  | { type: 'surveyor'; surveyorId: string }
  | { type: 'observation'; observationId: string };

export interface SurveyValidator {
  validate(context: SurveyContext, change: SurveyChange): void;
}

export class NoOpValidator implements SurveyValidator {
  validate(_context: SurveyContext, _change: SurveyChange): void {
    // No validation — default for development and testing
  }
}
