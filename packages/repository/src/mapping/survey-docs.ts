// SDK-agnostic Firestore doc -> domain mappers, shared by the RNFB repositories
// (device) and the Admin SDK report generator (Cloud Functions). Any new Date
// field nested in a doc must be converted here, once, for both backends.
import {
  compareSurveyors,
  type Location,
  type Observation,
  type Survey,
  type SurveyContext,
  type SurveyExport,
  type Surveyor,
} from '@bapp/domain';

/** `surveys/{surveyId}/exports/latest` holds the current {@link SurveyExport}. */
export const EXPORTS_SUBCOLLECTION = 'exports';
export const LATEST_EXPORT_DOC = 'latest';
/** Clients create docs here to ask the backend to (re)build the export. */
export const EXPORT_REQUESTS_SUBCOLLECTION = 'exportRequests';
/** `exportThrottles/{uid}` rate-limits each caller's export requests (see firestore.rules). */
export const EXPORT_THROTTLES_COLLECTION = 'exportThrottles';

export function reportsStoragePrefix(surveyId: string): string {
  return `surveys/${surveyId}/reports/`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DocData = Record<string, any>;

export interface RawDoc {
  id: string;
  data: DocData | undefined;
}

/** Convert a Firestore Timestamp (any SDK — duck-typed on `toDate`) or Date to a Date | null. */
export function toDateOrNull(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  if (typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

/** Required timestamp (createdAt/updatedAt); epoch only as a last resort for malformed docs. */
export function toDateRequired(value: unknown): Date {
  return toDateOrNull(value) ?? new Date(0);
}

export function surveyFromData(id: string, data: DocData | undefined): Survey {
  const d = data ?? {};
  return {
    id,
    adminCode: d.adminCode,
    surveyorCode: d.surveyorCode,
    name: d.name ?? null,
    postcode: d.postcode ?? null,
    date: toDateOrNull(d.date),
    sunsetTime: toDateOrNull(d.sunsetTime),
    startTime: toDateOrNull(d.startTime),
    endTime: toDateOrNull(d.endTime),
    boundary: d.boundary ?? null,
    status: d.status ?? 'draft',
    startWeather: d.startWeather ?? null,
    endWeather: d.endWeather ?? null,
    data: d.data ?? {},
    createdAt: toDateRequired(d.createdAt),
    updatedAt: toDateRequired(d.updatedAt),
  };
}

export function locationFromData(id: string, data: DocData | undefined): Location {
  const d = data ?? {};
  return {
    id,
    surveyId: d.surveyId,
    name: d.name ?? null,
    boundaryPosition: d.boundaryPosition ?? null,
    frontViewImage: d.frontViewImage ?? null,
    equipmentImage: d.equipmentImage ?? null,
    equipmentInformation: d.equipmentInformation ?? null,
    notes: Array.isArray(d.notes)
      ? d.notes.map((n: { text?: string; time?: unknown }) => ({ text: n.text ?? '', time: toDateRequired(n.time) }))
      : null,
    data: d.data ?? {},
    createdAt: toDateRequired(d.createdAt),
    updatedAt: toDateRequired(d.updatedAt),
  };
}

export function surveyorFromData(id: string, data: DocData | undefined): Surveyor {
  const d = data ?? {};
  return {
    id,
    surveyId: d.surveyId,
    locationId: d.locationId ?? null,
    name: d.name ?? null,
    isLead: d.isLead ?? false,
    status: d.status ?? 'pending',
    data: d.data ?? {},
    createdAt: toDateRequired(d.createdAt),
    updatedAt: toDateRequired(d.updatedAt),
  };
}

export function observationFromData(id: string, data: DocData | undefined): Observation {
  const d = data ?? {};
  return {
    id,
    surveyId: d.surveyId,
    locationId: d.locationId,
    surveyorId: d.surveyorId,
    species: d.species ?? null,
    firstSeenAt: toDateOrNull(d.firstSeenAt),
    lastSeenAt: toDateOrNull(d.lastSeenAt),
    seenCount: d.seenCount ?? 0,
    heardCount: d.heardCount ?? 0,
    frequency: d.frequency ?? null,
    direction: d.direction ?? null,
    notes: d.notes ?? null,
    emergence: d.emergence ?? false,
    flightPaths: d.flightPaths ?? [],
    data: d.data ?? {},
    createdAt: toDateRequired(d.createdAt),
    updatedAt: toDateRequired(d.updatedAt),
  };
}

export function surveyExportFromData(data: DocData | undefined): SurveyExport {
  const d = data ?? {};
  return {
    status: d.status ?? 'generating',
    storagePath: d.storagePath ?? null,
    fileName: d.fileName ?? null,
    fingerprint: d.fingerprint ?? null,
    missingMedia: Array.isArray(d.missingMedia) ? d.missingMedia : [],
    generatedAt: toDateOrNull(d.generatedAt),
    lastRequestId: d.lastRequestId ?? null,
    error: d.error ?? null,
  };
}

export function buildSurveyContext(raw: {
  survey: RawDoc;
  locations: RawDoc[];
  surveyors: RawDoc[];
  observations: RawDoc[];
}): SurveyContext {
  return {
    survey: surveyFromData(raw.survey.id, raw.survey.data),
    locations: raw.locations.map((d) => locationFromData(d.id, d.data)),
    surveyors: raw.surveyors.map((d) => surveyorFromData(d.id, d.data)).sort(compareSurveyors),
    observations: raw.observations.map((d) => observationFromData(d.id, d.data)),
  };
}
