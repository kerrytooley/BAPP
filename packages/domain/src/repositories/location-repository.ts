import type { Location, CreateLocationInput, UpdateLocationInput } from '../models/location';
import type { Unsubscribe } from './survey-repository';

export interface LocationRepository {
  create(input: CreateLocationInput): Promise<Location>;
  findById(id: string): Promise<Location | null>;
  findBySurveyId(surveyId: string): Promise<Location[]>;
  update(id: string, input: UpdateLocationInput): Promise<Location>;
  delete(id: string): Promise<void>;
  subscribeBySurveyId(surveyId: string, callback: (locations: Location[]) => void): Unsubscribe;
}
