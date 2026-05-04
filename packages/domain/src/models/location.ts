export interface BoundaryPosition {
  x: number;
  y: number;
}

export interface Location {
  id: string;
  surveyId: string;
  name: string | null;
  boundaryPosition: BoundaryPosition | null;
  frontViewImageRef: string | null;
  equipmentImageRef: string | null;
  data: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateLocationInput = {
  surveyId: string;
  name?: string | null;
  boundaryPosition?: BoundaryPosition | null;
  frontViewImageRef?: string | null;
  equipmentImageRef?: string | null;
  data?: Record<string, unknown>;
};

export type UpdateLocationInput = Partial<{
  name: string | null;
  boundaryPosition: BoundaryPosition | null;
  frontViewImageRef: string | null;
  equipmentImageRef: string | null;
  data: Record<string, unknown>;
}>;
