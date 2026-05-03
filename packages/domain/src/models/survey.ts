export type SurveyStatus = 'draft' | 'active' | 'completed';

export interface Survey {
  id: string;
  adminCode: string;
  surveyorCode: string;
  name: string | null;
  postcode: string | null;
  date: Date | null;
  sunsetTime: Date | null;
  startTime: Date | null;
  endTime: Date | null;
  boundaryImageRef: string | null;
  status: SurveyStatus;
  weather: Record<string, unknown>;
  data: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateSurveyInput = {
  name?: string | null;
  postcode?: string | null;
  date?: Date | null;
  sunsetTime?: Date | null;
  startTime?: Date | null;
  endTime?: Date | null;
  boundaryImageRef?: string | null;
  status?: SurveyStatus;
  weather?: Record<string, unknown>;
  data?: Record<string, unknown>;
};

export type UpdateSurveyInput = Partial<{
  name: string | null;
  postcode: string | null;
  date: Date | null;
  sunsetTime: Date | null;
  startTime: Date | null;
  endTime: Date | null;
  boundaryImageRef: string | null;
  status: SurveyStatus;
  weather: Record<string, unknown>;
  data: Record<string, unknown>;
}>;
