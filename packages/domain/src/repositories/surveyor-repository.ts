import type { Surveyor, CreateSurveyorInput, UpdateSurveyorInput } from '../models/surveyor';
import type { Unsubscribe } from './survey-repository';

export interface SurveyorRepository {
  create(input: CreateSurveyorInput): Promise<Surveyor>;
  findById(id: string): Promise<Surveyor | null>;
  findBySurveyId(surveyId: string): Promise<Surveyor[]>;
  update(id: string, input: UpdateSurveyorInput): Promise<Surveyor>;
  delete(id: string): Promise<void>;
  subscribeBySurveyId(surveyId: string, callback: (surveyors: Surveyor[]) => void): Unsubscribe;
}
