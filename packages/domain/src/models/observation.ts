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

/**
 * One stroke of a flight path. An observation's strokes on a surface together
 * form its (single) flight path on that surface.
 *
 * Reusing a path copies its strokes into the reusing observation, so every
 * observation stays self-contained; `pathKey` is what marks the copies as the
 * same path. Strokes drawn before reuse existed have no `pathKey` or `label`:
 * each observation's strokes on a surface then form a path of their own, and
 * its letter is derived from draw order (see flight-path-groups.ts).
 */
export interface FlightPath {
  id: string;
  surface: FlightPathSurface;
  points: FlightPathPoint[];
  /** Epoch ms when drawn; orders lettered paths. Older paths fall back to the observation's createdAt. */
  createdAt?: number;
  /** Identity of the path, shared by every copy of it. */
  pathKey?: string;
  /** Letter assigned when the path was first drawn (A, B, … per surveyor per surface); copied with it. */
  label?: string;
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
  frequency?: string | null;
  direction?: string | null;
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
  frequency: string | null;
  direction: string | null;
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
    frequency: input.frequency ?? null,
    direction: input.direction ?? null,
    emergence: input.emergence ?? false,
    flightPaths: input.flightPaths ?? [],
    data: input.data ?? {},
  };
}
