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
  startWeather: ReportWeather;
  endWeather: ReportWeather;
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
  /** 1-based; prefixes flight path labels (`1A`) and names the XLSX surveyor sheets. */
  number: number;
  name: string | null;
  isLead: boolean;
  status: SurveyorStatus;
  locationId: string | null;
}

export interface ReportLocation {
  id: string;
  name: string | null;
  equipmentInformation: EquipmentInfo;
  notes: LocationNotes[];
}

export interface EquipmentInfo {
  audioLabel: string;
  videoLabel: string;
  otherInfo: string;
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
  /** Label (e.g. `1A`) of the overhead flight path this observation recorded. */
  overheadPath: string | null;
  /** Label (e.g. `1A`) of the front-view flight path this observation recorded. */
  frontViewPath: string | null;
}

export interface LocationNotes {
  text: string,
  time: Date
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
  /** One checklist entry per lettered flight path drawn on this figure. */
  pathGroups: ReportPathGroup[];
  /** False on front-view figures, which belong to a single surveyor. */
  showSurveyorNames: boolean;
  /** Location markers drawn on this figure (boundary figure only). */
  pins: ReportFigurePin[];
}

/**
 * A lettered flight path (`1A` = surveyor 1, path A) shared by every
 * observation that drew or linked to it.
 */
export interface ReportPathGroup {
  groupId: string;
  label: string;
  color: string;
  members: ReportPathGroupMember[];
}

export interface ReportPathGroupMember {
  observationId: string;
  surveyorName: string | null;
  /** UTC HH:MM of first sighting, or '' when unknown. */
  time: string;
  species: string;
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
 * A single polyline on a figure, tagged with its {@link ReportPathGroup} so the
 * HTML can toggle a lettered path as one. `observationId` is the observation
 * that drew it. Points are the domain's normalized `[0,1]` coordinates.
 */
export interface ReportFigurePath {
  observationId: string;
  groupId: string;
  color: string;
  label: string;
  points: FlightPathPoint[];
}
