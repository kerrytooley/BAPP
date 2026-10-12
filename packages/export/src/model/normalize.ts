import {
  buildFlightPathGroups,
  type FlightPathGroup,
  type FlightPathSurface,
  type Location,
  type Observation,
  type SurveyContext,
  type Weather,
} from '@bapp/domain';
import { colorForIndex } from './colors';
import type {
  ReportFigure,
  ReportFigurePath,
  ReportFigurePin,
  ReportModel,
  ReportObservation,
  ReportPathGroup,
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

  const surveyorNumber = new Map(surveyors.map((s, index) => [s.id, index + 1]));
  const surveyorName = new Map(surveyors.map((s) => [s.id, s.name]));
  const boundaryGroups = labelGroups(ordered, 'boundary', surveyorNumber, surveyors);
  const frontViewGroups = labelGroups(ordered, 'frontView', surveyorNumber, surveyors);
  const obsById = new Map(ordered.map((o) => [o.id, o]));
  const figureGroups = (groups: LabelledGroup[], locationId?: string) =>
    collectPathGroups(groups, obsById, surveyorName, locationId);

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
      overheadPath: groupLabelFor(boundaryGroups, obs.id),
      frontViewPath: groupLabelFor(frontViewGroups, obs.id),
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
      ...figureGroups(boundaryGroups),
      showSurveyorNames: true,
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
      ...figureGroups(frontViewGroups, location.id),
      showSurveyorNames: false,
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
      pathGroups: [],
      showSurveyorNames: false,
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
      startWeather: normalizeWeather(survey.startWeather),
      endWeather: normalizeWeather(survey.endWeather)
    },
    surveyors: surveyors.map((s, index) => ({
      id: s.id,
      number: index + 1,
      name: s.name,
      isLead: s.isLead,
      status: s.status,
      locationId: s.locationId,
    })),
    locations: locations.map((l) => ({
      id: l.id,
      name: l.name,
      equipmentInformation: {
        audioLabel: l.equipmentInformation?.audioLabel ?? '',
        videoLabel: l.equipmentInformation?.videoLabel ?? '',
        otherInfo: l.equipmentInformation?.otherInfo ?? '',
      },
      notes: (l.notes ?? []).map((n) => ({ text: n.text, time: n.time })),
    })),
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

/** Pull the known weather readings out of the survey's weather record. */
function normalizeWeather(weather: Weather | null | undefined): ReportWeather {
  const read = (value: string | null | undefined): string | null => {
    if (value === null || value === undefined || value === '') return null;
    return String(value);
  };
  return {
    temperature: read(weather?.temperature),
    wind: read(weather?.wind),
    humidity: read(weather?.humidity),
    rain: read(weather?.rain),
    cloudCover: read(weather?.cloudCover),
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

interface LabelledGroup {
  group: FlightPathGroup;
  groupId: string;
  label: string;
}

/** Every surveyor's lettered paths on `surface`, labelled `{surveyorNumber}{letter}` in surveyor order. */
function labelGroups(
  observations: Observation[],
  surface: FlightPathSurface,
  surveyorNumber: Map<string, number>,
  surveyors: SurveyContext['surveyors'],
): LabelledGroup[] {
  const surveyorIds = [
    ...new Set([...surveyors.map((s) => s.id), ...observations.map((o) => o.surveyorId)]),
  ];
  return surveyorIds.flatMap((surveyorId) =>
    buildFlightPathGroups(observations, surveyorId, surface).map((group) => ({
      group,
      groupId: `${surface}:${group.key}`,
      label: `${surveyorNumber.get(surveyorId) ?? '?'}${group.letter}`,
    })),
  );
}

function groupLabelFor(groups: LabelledGroup[], observationId: string): string | null {
  return groups.find((g) => g.group.memberObservationIds.includes(observationId))?.label ?? null;
}

function collectPathGroups(
  groups: LabelledGroup[],
  obsById: Map<string, Observation>,
  surveyorName: Map<string, string | null>,
  locationId?: string,
): { paths: ReportFigurePath[]; pathGroups: ReportPathGroup[] } {
  const shown = locationId === undefined
    ? groups
    : groups.filter((g) => obsById.get(g.group.sourceObservationId)?.locationId === locationId);

  const paths: ReportFigurePath[] = [];
  const pathGroups = shown.map(({ group, groupId, label }, index): ReportPathGroup => {
    const color = colorForIndex(index);
    for (const flightPath of group.paths) {
      paths.push({
        observationId: group.sourceObservationId,
        groupId,
        color,
        label,
        points: flightPath.points,
      });
    }
    const members = group.memberObservationIds
      .map((id) => obsById.get(id)!)
      .sort(compareObservations)
      .map((o) => ({
        observationId: o.id,
        surveyorName: surveyorName.get(o.surveyorId) ?? null,
        time: formatTime(o.firstSeenAt),
        species: o.species ?? 'Unknown species',
      }));
    return { groupId, label, color, members };
  });

  return { paths, pathGroups };
}

/** Chronological by `firstSeenAt` (nulls last), then by id for stability. */
function compareObservations(a: Observation, b: Observation): number {
  const at = a.firstSeenAt?.getTime() ?? Number.POSITIVE_INFINITY;
  const bt = b.firstSeenAt?.getTime() ?? Number.POSITIVE_INFINITY;
  if (at !== bt) return at - bt;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
