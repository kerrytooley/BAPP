// TODO: Implement concrete repository classes in the repository package

import type { Survey, CreateSurveyInput, UpdateSurveyInput } from '../models/survey';

export interface SurveyRepository {
  create(input: CreateSurveyInput): Promise<Survey>;
  findById(id: string): Promise<Survey | null>;
  findByAdminId(adminId: string): Promise<Survey[]>;
  update(id: string, input: UpdateSurveyInput): Promise<Survey>;
  delete(id: string): Promise<void>;
}
