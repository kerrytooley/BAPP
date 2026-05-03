export interface FlightPathPoint {
  x: number;
  y: number;
}

export interface FlightPath {
  id: string;
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
  notes: string | null;
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
  notes?: string | null;
  flightPaths?: FlightPath[];
  data?: Record<string, unknown>;
};

export type UpdateObservationInput = Partial<{
  species: string | null;
  firstSeenAt: Date | null;
  lastSeenAt: Date | null;
  seenCount: number;
  heardCount: number;
  notes: string | null;
  flightPaths: FlightPath[];
  data: Record<string, unknown>;
}>;
