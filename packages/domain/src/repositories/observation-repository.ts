import type { Observation, CreateObservationInput, UpdateObservationInput } from '../models/observation';
import type { Unsubscribe } from './survey-repository';

export interface ObservationRepository {
  create(input: CreateObservationInput): Promise<Observation>;
  findById(id: string): Promise<Observation | null>;
  findBySurveyId(surveyId: string): Promise<Observation[]>;
  findByLocationId(locationId: string): Promise<Observation[]>;
  update(id: string, input: UpdateObservationInput): Promise<Observation>;
  delete(id: string): Promise<void>;
  subscribeByLocationId(locationId: string, callback: (observations: Observation[]) => void): Unsubscribe;
  subscribeBySurveyId(surveyId: string, callback: (observations: Observation[]) => void): Unsubscribe;
}
