import type { MediaAsset } from './media';

export interface BoundaryPosition {
  x: number;
  y: number;
}

export interface NotesProps {
  text: string,
  time: Date
}

export interface Location {
  id: string;
  surveyId: string;
  name: string | null;
  boundaryPosition: BoundaryPosition | null;
  frontViewImage: MediaAsset | null;
  equipmentImage: MediaAsset | null;
  notes: NotesProps[] | null;
  data: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateLocationInput = {
  surveyId: string;
  name?: string | null;
  boundaryPosition?: BoundaryPosition | null;
  frontViewImage?: MediaAsset | null;
  equipmentImage?: MediaAsset | null;
  notes?: NotesProps[] | null;
  data?: Record<string, unknown>;
};

export type UpdateLocationInput = Partial<{
  name: string | null;
  boundaryPosition: BoundaryPosition | null;
  frontViewImage: MediaAsset | null;
  equipmentImage: MediaAsset | null;
  notes: NotesProps[] | null;
  data: Record<string, unknown>;
}>;

/** A fully-defaulted location minus the fields each backend owns (id, timestamps). */
export type NewLocationFields = Omit<Location, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Apply business-field defaults to a create input, producing a complete location
 * shape (minus id/timestamps) shared by every repository backend.
 */
export function applyLocationDefaults(input: CreateLocationInput): NewLocationFields {
  return {
    surveyId: input.surveyId,
    name: input.name ?? null,
    boundaryPosition: input.boundaryPosition ?? null,
    frontViewImage: input.frontViewImage ?? null,
    equipmentImage: input.equipmentImage ?? null,
    notes: input.notes ?? null,
    data: input.data ?? {},
  };
}
