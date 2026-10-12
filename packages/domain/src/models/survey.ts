import type { MediaAsset } from './media';

export type SurveyStatus = 'draft' | 'active' | 'completed';

export interface Weather {
  temperature: string,
  cloudCover: string,
  humidity: string,
  wind: string,
  rain: string
}

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
  startWeather: Weather | null;
  endWeather: Weather | null;
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
  startWeather?: Weather | null;
  endWeather?: Weather | null;
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
    startWeather: input.startWeather ?? null,
    endWeather: input.endWeather ?? null,
    data: input.data ?? {},
  };
}

/** A survey's times as real moments, anchored to its date. */
export interface SurveySchedule {
  start: Date | null;
  sunset: Date | null;
  end: Date | null;
}

const atTimeOf = (day: Date, time: Date): Date => {
  const moment = new Date(day);
  moment.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return moment;
};

/**
 * Stored times carry only a time of day. Sunrise/sunset and end that fall
 * earlier in the day than the start are the next day (surveys can cross midnight).
 */
export function surveySchedule(
  survey: Pick<Survey, 'date' | 'startTime' | 'sunsetTime' | 'endTime'>,
): SurveySchedule {
  const { date, startTime, sunsetTime, endTime } = survey;
  const start = startTime ? atTimeOf(date ?? startTime, startTime) : null;
  const afterStart = (time: Date | null): Date | null => {
    if (!time) return null;
    const moment = atTimeOf(start ?? date ?? time, time);
    if (start && moment <= start) moment.setDate(moment.getDate() + 1);
    return moment;
  };
  return { start, sunset: afterStart(sunsetTime), end: afterStart(endTime) };
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
  startWeather: Weather | null;
  endWeather: Weather | null;
  data: Record<string, unknown>;
}>;
