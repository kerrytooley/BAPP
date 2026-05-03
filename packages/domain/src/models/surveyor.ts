export type SurveyorStatus = 'pending' | 'ready' | 'done';

export interface Surveyor {
  id: string;
  surveyId: string;
  name: string | null;
  isLead: boolean;
  status: SurveyorStatus;
  data: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateSurveyorInput = {
  surveyId: string;
  name?: string | null;
  isLead?: boolean;
  status?: SurveyorStatus;
  data?: Record<string, unknown>;
};

export type UpdateSurveyorInput = Partial<{
  name: string | null;
  isLead: boolean;
  status: SurveyorStatus;
  data: Record<string, unknown>;
}>;
