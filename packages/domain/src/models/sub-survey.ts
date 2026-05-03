// TODO: Add sub-survey validation and business rules

export type SubSurveyStatus = 'pending' | 'in-progress' | 'completed';

export interface SubSurvey {
  id: string;
  surveyId: string;
  surveyorId: string;
  siteLocation: string;
  status: SubSurveyStatus;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateSubSurveyInput = Omit<SubSurvey, 'id' | 'createdAt' | 'updatedAt'>;
