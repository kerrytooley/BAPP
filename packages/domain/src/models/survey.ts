// TODO: Add full survey validation and business rules

export type SurveyStatus = 'draft' | 'active' | 'completed';

export interface Survey {
  id: string;
  name: string;
  description?: string;
  adminId: string;
  siteLocations: string[];
  status: SurveyStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateSurveyInput = Omit<Survey, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateSurveyInput = Partial<Omit<Survey, 'id' | 'adminId' | 'createdAt'>>;
