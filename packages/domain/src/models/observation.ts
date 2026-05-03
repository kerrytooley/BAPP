// TODO: Add observation validation and business rules

export interface Observation {
  id: string;
  subSurveyId: string;
  species?: string;
  count?: number;
  notes?: string;
  imageUrls: string[];
  latitude?: number;
  longitude?: number;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateObservationInput = Omit<Observation, 'id' | 'createdAt' | 'updatedAt'>;
