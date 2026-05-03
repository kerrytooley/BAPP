import type { Survey } from './models/survey';
import type { Location } from './models/location';
import type { Surveyor } from './models/surveyor';
import type { Observation } from './models/observation';

export interface SurveyContext {
  survey: Survey;
  locations: Location[];
  surveyors: Surveyor[];
  observations: Observation[];
}
