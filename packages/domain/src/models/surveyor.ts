export type SurveyorStatus = 'pending' | 'confirmed' | 'ready' | 'done';

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

/** A fully-defaulted surveyor minus the fields each backend owns (id, timestamps). */
export type NewSurveyorFields = Omit<Surveyor, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Apply business-field defaults to a create input, producing a complete surveyor
 * shape (minus id/timestamps) shared by every repository backend.
 */
export function applySurveyorDefaults(input: CreateSurveyorInput): NewSurveyorFields {
  return {
    surveyId: input.surveyId,
    locationId: input.locationId ?? null,
    name: input.name ?? null,
    isLead: input.isLead ?? false,
    status: input.status ?? 'pending',
    data: input.data ?? {},
  };
}

/** Lead first, then in the order surveyors were added. */
export function compareSurveyors(a: Surveyor, b: Surveyor): number {
  if (a.isLead !== b.isLead) return a.isLead ? -1 : 1;
  const byCreation = a.createdAt.getTime() - b.createdAt.getTime();
  if (byCreation !== 0) return byCreation;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
