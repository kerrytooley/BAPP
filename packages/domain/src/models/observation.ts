export interface FlightPathPoint {
  x: number;
  y: number;
}

/**
 * Which image's coordinate space a flight path's points live in. Points are
 * normalized [0,1], so they are only meaningful relative to a specific surface:
 * - `boundary`  — the birds-eye view drawn on the survey's boundary image
 * - `frontView` — the as-seen view drawn on the location's front-view photo
 */
export type FlightPathSurface = 'boundary' | 'frontView';

export interface FlightPath {
  id: string;
  surface: FlightPathSurface;
  points: FlightPathPoint[];
  data?: Record<string, unknown>;
}

export interface Observation {
  id: string;
  surveyId: string;
  locationId: string;
  surveyorId: string;
  species: string | null;
  firstSeenAt: Date | null;
  lastSeenAt: Date | null;
  seenCount: number;
  heardCount: number;
  frequency: string | null;
  direction: string | null;
  notes: string | null;
  emergence: boolean;
  flightPaths: FlightPath[];
  data: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateObservationInput = {
  surveyId: string;
  locationId: string;
  surveyorId: string;
  species?: string | null;
  firstSeenAt?: Date | null;
  lastSeenAt?: Date | null;
  seenCount?: number;
  heardCount?: number;
  frequency?: string;
  direction?: string;
  notes?: string | null;
  emergence?: boolean;
  flightPaths?: FlightPath[];
  data?: Record<string, unknown>;
};

export type UpdateObservationInput = Partial<{
  species: string | null;
  firstSeenAt: Date | null;
  lastSeenAt: Date | null;
  seenCount: number;
  heardCount: number;
  frequency: string;
  direction: string;
  notes: string | null;
  emergence: boolean;
  flightPaths: FlightPath[];
  data: Record<string, unknown>;
}>;

/** A fully-defaulted observation minus the fields each backend owns (id, timestamps). */
export type NewObservationFields = Omit<Observation, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Apply business-field defaults to a create input, producing a complete
 * observation shape (minus id/timestamps) shared by every repository backend.
 */
export function applyObservationDefaults(input: CreateObservationInput): NewObservationFields {
  return {
    surveyId: input.surveyId,
    locationId: input.locationId,
    surveyorId: input.surveyorId,
    species: input.species ?? null,
    firstSeenAt: input.firstSeenAt ?? null,
    lastSeenAt: input.lastSeenAt ?? null,
    seenCount: input.seenCount ?? 0,
    heardCount: input.heardCount ?? 0,
    notes: input.notes ?? null,
    flightPaths: input.flightPaths ?? [],
    data: input.data ?? {},
  };
}
