import type { Survey, CreateSurveyInput, UpdateSurveyInput } from '../models/survey';

export type Unsubscribe = () => void;

export interface SurveyRepository {
  create(input: CreateSurveyInput): Promise<Survey>;
  findById(id: string): Promise<Survey | null>;
  findByAdminCode(adminCode: string): Promise<Survey | null>;
  findBySurveyorCode(surveyorCode: string): Promise<Survey | null>;
  update(id: string, input: UpdateSurveyInput): Promise<Survey>;
  delete(id: string): Promise<void>;
  subscribeById(id: string, callback: (survey: Survey | null) => void): Unsubscribe;
}
