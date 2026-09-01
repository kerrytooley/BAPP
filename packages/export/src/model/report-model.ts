import type {
  FlightPathPoint,
  SurveyStatus,
  SurveyorStatus,
} from '@bapp/domain';

/**
 * Presentation-ready shape produced by {@link normalizeReport} from a raw
 * `SurveyContext`. The artifact builders (HTML, XLSX) consume this so they never
 * depend on domain-model churn. Everything is joined by id and colors/labels are
 * pre-assigned so the HTML, XLSX and legend all agree.
 */
export interface ReportModel {
  survey: ReportSurvey;
  surveyors: ReportSurveyor[];
  locations: ReportLocation[];
  observations: ReportObservation[];
  figures: ReportFigure[];
}

export interface ReportSurvey {
  id: string;
  name: string | null;
  postcode: string | null;
  date: Date | null;
  status: SurveyStatus;
  /** Free-form weather readings captured for the survey (stringified). */
  weather: ReportWeather;
}

/** Weather readings surfaced on the Overview sheet. Values are display strings. */
export interface ReportWeather {
  temperature: string | null;
  wind: string | null;
  humidity: string | null;
  rain: string | null;
  cloudCover: string | null;
}

export interface ReportSurveyor {
  id: string;
  name: string | null;
  isLead: boolean;
  status: SurveyorStatus;
}

export interface ReportLocation {
  id: string;
  name: string | null;
}

/**
 * An observation flattened for presentation, with a deterministic `color` and
 * `label` used by the figure overlays, the legend and the XLSX rows.
 */
export interface ReportObservation {
  id: string;
  surveyorId: string;
  locationId: string;
  species: string | null;
  firstSeenAt: Date | null;
  lastSeenAt: Date | null;
  seenCount: number;
  heardCount: number;
  frequency: string | null;
  direction: string | null;
  notes: string | null;
  emergence: boolean;
  color: string;
  label: string;
}

export type ReportFigureKind = 'boundary' | 'frontView' | 'equipment';

/**
 * One image plus the flight paths drawn on it. `boundary` yields a single figure
 * per survey; `frontView` and `equipment` yield one figure per location that has
 * the corresponding image. `figureId` is the deep-link join key (`boundary`,
 * `loc_{locationId}` or `equip_{locationId}`).
 *
 * `equipment` figures are reference photos only — they never carry flight paths.
 * The boundary figure additionally carries {@link ReportFigurePin}s marking each
 * location's position on the birds-eye image.
 */
export interface ReportFigure {
  figureId: string;
  kind: ReportFigureKind;
  title: string;
  /** The `MediaAsset` ref to resolve to bytes later (renderRef preferred). */
  imageRef: string;
  /** `null` for the boundary figure; the location id for per-location figures. */
  locationId: string | null;
  paths: ReportFigurePath[];
  /** Location markers drawn on this figure (boundary figure only). */
  pins: ReportFigurePin[];
}

/**
 * A location marker on a figure, positioned in the domain's normalized `[0,1]`
 * boundary coordinate space. Rendered as a toggleable pin in the HTML checklist
 * so the admin can show/hide surveyor positions on the birds-eye image.
 */
export interface ReportFigurePin {
  locationId: string;
  label: string;
  x: number;
  y: number;
  /** Names of surveyors assigned to this location (may be empty). */
  surveyorNames: string[];
}

/**
 * A single polyline on a figure, tagged with the observation it belongs to so
 * the HTML can group them into a per-observation checklist. Points are the
 * domain's normalized `[0,1]` coordinates — never pixels.
 */
export interface ReportFigurePath {
  observationId: string;
  color: string;
  label: string;
  points: FlightPathPoint[];
}
