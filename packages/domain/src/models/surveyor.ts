export type SurveyorStatus = 'pending' | 'ready' | 'done';

export interface Surveyor {
  id: string;
  surveyId: string;
  locationId: string | null;
  name: string | null;
  isLead: boolean;
  status: SurveyorStatus;
  data: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateSurveyorInput = {
  surveyId: string;
  locationId?: string | null;
  name?: string | null;
  isLead?: boolean;
  status?: SurveyorStatus;
  data?: Record<string, unknown>;
};

export type UpdateSurveyorInput = Partial<{
  locationId: string | null;
  name: string | null;
  isLead: boolean;
  status: SurveyorStatus;
  data: Record<string, unknown>;
}>;
