// TODO: Implement concrete repository classes in the repository package

import type { SubSurvey, CreateSubSurveyInput } from '../models/sub-survey';

export interface SubSurveyRepository {
  create(input: CreateSubSurveyInput): Promise<SubSurvey>;
  findById(id: string): Promise<SubSurvey | null>;
  findBySurveyId(surveyId: string): Promise<SubSurvey[]>;
  findBySurveyorId(surveyorId: string): Promise<SubSurvey[]>;
  update(id: string, input: Partial<SubSurvey>): Promise<SubSurvey>;
  delete(id: string): Promise<void>;
}
