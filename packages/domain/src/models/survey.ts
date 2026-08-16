import type { MediaAsset } from './media';

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
  boundary: MediaAsset | null;
  status: SurveyStatus;
  weather: Record<string, unknown>;
  data: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateSurveyInput = {
  // Join codes are generated and normalized by the domain service, never by a
  // repository — so both backends persist identical codes. Always supplied.
  adminCode: string;
  surveyorCode: string;
  name?: string | null;
  postcode?: string | null;
  date?: Date | null;
  sunsetTime?: Date | null;
  startTime?: Date | null;
  endTime?: Date | null;
  boundary?: MediaAsset | null;
  status?: SurveyStatus;
  weather?: Record<string, unknown>;
  data?: Record<string, unknown>;
};

/** A fully-defaulted survey minus the fields each backend owns (id, timestamps). */
export type NewSurveyFields = Omit<Survey, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Apply business-field defaults to a create input, producing a complete survey
 * shape (minus id/timestamps). Centralizing this keeps every repository backend
 * agreeing on what a new survey *is*, instead of each hand-coding `?? default`.
 */
export function applySurveyDefaults(input: CreateSurveyInput): NewSurveyFields {
  return {
    adminCode: input.adminCode,
    surveyorCode: input.surveyorCode,
    name: input.name ?? null,
    postcode: input.postcode ?? null,
    date: input.date ?? null,
    sunsetTime: input.sunsetTime ?? null,
    startTime: input.startTime ?? null,
    endTime: input.endTime ?? null,
    boundary: input.boundary ?? null,
    status: input.status ?? 'draft',
    weather: input.weather ?? {},
    data: input.data ?? {},
  };
}

export type UpdateSurveyInput = Partial<{
  name: string | null;
  postcode: string | null;
  date: Date | null;
  sunsetTime: Date | null;
  startTime: Date | null;
  endTime: Date | null;
  boundary: MediaAsset | null;
  status: SurveyStatus;
  weather: Record<string, unknown>;
  data: Record<string, unknown>;
}>;
