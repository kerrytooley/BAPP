import type {
  Location,
  Observation,
  SurveyContext,
} from '@bapp/domain';
import { colorForIndex } from './colors';
import type {
  ReportFigure,
  ReportFigurePath,
  ReportFigurePin,
  ReportModel,
  ReportObservation,
  ReportWeather,
} from './report-model';

/**
 * Normalize a raw `SurveyContext` into a presentation-ready {@link ReportModel}.
 *
 * Pure and deterministic: observations are ordered chronologically (then by id)
 * so each gets a stable color/label regardless of input order, and figures are
 * emitted boundary-first then per location. Only surfaces that actually have a
 * base image become figures (there must be pixels to draw on).
 */
export function normalizeReport(context: SurveyContext): ReportModel {
  const { survey, surveyors, locations, observations } = context;

  const ordered = [...observations].sort(compareObservations);

  const leadSurveyorName =
    surveyors.find((s) => s.isLead)?.name ?? surveyors[0]?.name ?? null;
  const surveyorNameForLocation = (locationId: string): string | null =>
    surveyors.find((s) => s.locationId === locationId)?.name ?? null;

  const meta = new Map<string, { color: string; label: string }>();
  ordered.forEach((obs, index) => {
    meta.set(obs.id, {
      color: colorForIndex(index),
      label: flightPathLabel(obs),
    });
  });

  const reportObservations: ReportObservation[] = ordered.map((obs) => {
    const { color, label } = meta.get(obs.id)!;
    return {
      id: obs.id,
      surveyorId: obs.surveyorId,
      locationId: obs.locationId,
      species: obs.species,
      firstSeenAt: obs.firstSeenAt,
      lastSeenAt: obs.lastSeenAt,
      seenCount: obs.seenCount,
      heardCount: obs.heardCount,
      frequency: obs.frequency,
      direction: obs.direction,
      notes: obs.notes,
      emergence: obs.emergence,
      color,
      label,
    };
  });

  const figures: ReportFigure[] = [];

  const boundaryRef = imageRef(survey.boundary);
  if (boundaryRef) {
    figures.push({
      figureId: 'boundary',
      kind: 'boundary',
      title: leadSurveyorName ? `${leadSurveyorName} Overhead` : 'Overhead',
      imageRef: boundaryRef,
      locationId: null,
      paths: collectPaths(ordered, meta, 'boundary'),
      pins: collectPins(locations, surveyors),
    });
  }

  for (const location of locations) {
    const ref = imageRef(location.frontViewImage);
    if (!ref) continue;
    const surveyor = surveyorNameForLocation(location.id);
    figures.push({
      figureId: `loc_${location.id}`,
      kind: 'frontView',
      title: surveyor ? `${surveyor} Surveyor View` : 'Surveyor View',
      imageRef: ref,
      locationId: location.id,
      paths: collectPaths(ordered, meta, 'frontView', location.id),
      pins: [],
    });
  }

  for (const location of locations) {
    const ref = imageRef(location.equipmentImage);
    if (!ref) continue;
    figures.push({
      figureId: `equip_${location.id}`,
      kind: 'equipment',
      title: `${location.name ?? 'Location'} — equipment`,
      imageRef: ref,
      locationId: location.id,
      paths: [],
      pins: [],
    });
  }

  return {
    survey: {
      id: survey.id,
      name: survey.name,
      postcode: survey.postcode,
      date: survey.date,
      status: survey.status,
      weather: normalizeWeather(survey.weather),
    },
    surveyors: surveyors.map((s) => ({
      id: s.id,
      name: s.name,
      isLead: s.isLead,
      status: s.status,
    })),
    locations: locations.map((l) => ({ id: l.id, name: l.name })),
    observations: reportObservations,
    figures,
  };
}

/** Return the displayable raster only after media processing completes. */
function imageRef(asset: Location['frontViewImage']): string | null {
  if (asset?.status !== 'ready') return null;
  return asset.renderRef;
}

/** Flight-path label shown in the report checklist: observation id + first-seen time + species. */
function flightPathLabel(obs: Observation): string {
  const species = obs.species ?? 'Unknown species';
  const time = formatTime(obs.firstSeenAt);
  return [obs.id, time, species].filter(Boolean).join(' - ');
}

/** UTC HH:MM, matching the spreadsheet's time formatting. */
function formatTime(date: Date | null): string {
  if (!date) return '';
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Pull the known weather readings out of the survey's free-form record. */
function normalizeWeather(weather: Record<string, unknown>): ReportWeather {
  const read = (key: string): string | null => {
    const value = weather[key];
    if (value === null || value === undefined || value === '') return null;
    return String(value);
  };
  return {
    temperature: read('temperature'),
    wind: read('wind'),
    humidity: read('humidity'),
    rain: read('rain'),
    cloudCover: read('cloudCover'),
  };
}

/**
 * Build the location markers for the boundary figure from each location's
 * normalized `boundaryPosition`, joined to the surveyors assigned there.
 */
function collectPins(
  locations: SurveyContext['locations'],
  surveyors: SurveyContext['surveyors'],
): ReportFigurePin[] {
  const pins: ReportFigurePin[] = [];
  for (const location of locations) {
    const position = location.boundaryPosition;
    if (!position) continue;
    const surveyorNames = surveyors
      .filter((s) => s.locationId === location.id)
      .map((s) => s.name ?? 'Unnamed surveyor');
    pins.push({
      locationId: location.id,
      label: location.name ?? 'Location',
      x: position.x,
      y: position.y,
      surveyorNames,
    });
  }
  return pins;
}

function collectPaths(
  observations: Observation[],
  meta: Map<string, { color: string; label: string }>,
  surface: 'boundary' | 'frontView',
  locationId?: string,
): ReportFigurePath[] {
  const paths: ReportFigurePath[] = [];
  for (const obs of observations) {
    if (locationId !== undefined && obs.locationId !== locationId) continue;
    for (const flightPath of obs.flightPaths) {
      if (flightPath.surface !== surface) continue;
      const { color, label } = meta.get(obs.id)!;
      paths.push({
        observationId: obs.id,
        color,
        label,
        points: flightPath.points,
      });
    }
  }
  return paths;
}

/** Chronological by `firstSeenAt` (nulls last), then by id for stability. */
function compareObservations(a: Observation, b: Observation): number {
  const at = a.firstSeenAt?.getTime() ?? Number.POSITIVE_INFINITY;
  const bt = b.firstSeenAt?.getTime() ?? Number.POSITIVE_INFINITY;
  if (at !== bt) return at - bt;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
