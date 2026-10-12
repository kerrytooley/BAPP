import * as XLSX from 'xlsx';
import type {
  ReportModel,
  ReportObservation,
  LocationNotes
} from '../model/report-model';

export interface BuildWorkbookOptions {
  /**
   * Href of the interactive report used for deep-links from spreadsheet cells.
   * Uses a `?query` (not `#hash`) so the HTML runtime can read it on load.
   * Defaults to `flight-paths.html` (the sibling file inside the exported zip).
   */
  reportHref?: string;
}

/**
 * Build the `survey-data.xlsx` workbook from a {@link ReportModel}.
 *
 * Pure and synchronous. Produces three kinds of sheet:
 * - `Overview`  — survey metadata + headline counts.
 * - `Surveyor …` — one sheet per surveyor with just their observations.
 * - `Chronological` — every observation in time order.
 *
 * Each observation row deep-links into `flight-paths.html` via `?fig=&obs=` so the
 * admin can jump from a spreadsheet row straight to the flight path on the
 * figure. The join key everywhere is the observation id.
 */
export function buildReportWorkbook(
  model: ReportModel,
  options: BuildWorkbookOptions = {},
): Uint8Array {
  const reportHref = options.reportHref ?? 'flight-paths.html';
  const wb = XLSX.utils.book_new();

  const surveyorName = new Map(model.surveyors.map((s) => [s.id, s.name ?? s.id]));
  const locationName = new Map(model.locations.map((l) => [l.id, l.name ?? l.id]));
  const notesByLocation = new Map(model.locations.map((l) => [l.id, l.notes]));
  const figureForObs = buildFigureIndex(model);
  const figureIds = new Set(model.figures.map((f) => f.figureId));

  const linkTo = (figureId: string, obs: ReportObservation): string =>
    `${reportHref}?fig=${encodeURIComponent(figureId)}&obs=${encodeURIComponent(obs.id)}`;

  const deepLink = (obs: ReportObservation): string | undefined => {
    const figureId = figureForObs.get(obs.id);
    return figureId ? linkTo(figureId, obs) : undefined;
  };

  const pathCell = (obs: ReportObservation, surface: 'boundary' | 'frontView'): CellValue => {
    const label = surface === 'boundary' ? obs.overheadPath : obs.frontViewPath;
    if (!label) return '';
    const figureId = surface === 'boundary' ? 'boundary' : `loc_${obs.locationId}`;
    return figureIds.has(figureId) ? { v: label, l: linkTo(figureId, obs) } : label;
  };

  // ---- Overview ---------------------------------------------------------
  const startWeather = model.survey.startWeather;
  const endWeather = model.survey.endWeather
  const overview = makeSheet([
    ['Survey', model.survey.name ?? ''],
    ['Postcode', model.survey.postcode ?? ''],
    ['Date', model.survey.date ? formatDate(model.survey.date) : ''],
    ['Status', model.survey.status],
    [],
    ['Start weather conditions'],
    ['Temperature (°C)', startWeather.temperature ?? ''],
    ['Wind', startWeather.wind ?? ''],
    ['Humidity (%)', startWeather.humidity ?? ''],
    ['Rain', startWeather.rain ?? ''],
    ['Cloud cover (%)', startWeather.cloudCover ?? ''],
    [],
    [],
    ['End weather conditions'],
    ['Temperature (°C)', endWeather.temperature ?? ''],
    ['Wind', endWeather.wind ?? ''],
    ['Humidity (%)', endWeather.humidity ?? ''],
    ['Rain (minutes)', endWeather.rain ?? ''],
    ['Cloud cover (%)', endWeather.cloudCover ?? ''],
    [],
    ['Surveyors', model.surveyors.length],
    ['Locations', model.locations.length],
    ['Observations', model.observations.length],
  ]);
  overview['!cols'] = [{ wch: 18 }, { wch: 32 }];
  XLSX.utils.book_append_sheet(wb, overview, 'Overview');

  // ---- One sheet per surveyor ------------------------------------------
  const usedNames = new Set<string>(['Overview']);
  model.surveyors.forEach((surveyor) => {
    const rows = model.observations.filter((o) => o.surveyorId === surveyor.id);
    const notes = surveyor.locationId ? notesByLocation.get(surveyor.locationId) ?? [] : [];
    const sheet = observationSheet(rows, notes, {
      includeSurveyor: false,
      surveyorName,
      locationName,
      deepLink,
      pathCell,
    });
    const name = uniqueSheetName(
      `Surveyor ${surveyor.number} - ${surveyor.name ?? surveyor.id}`,
      usedNames,
    );
    XLSX.utils.book_append_sheet(wb, sheet, name);
  });

  // ---- Chronological (all observations) --------------------------------
  const chronological = observationSheet(model.observations, [], {
    includeSurveyor: true,
    surveyorName,
    locationName,
    deepLink,
    pathCell,
  });
  XLSX.utils.book_append_sheet(wb, chronological, 'Chronological');

  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return new Uint8Array(out);
}

interface ObservationSheetContext {
  includeSurveyor: boolean;
  surveyorName: Map<string, string>;
  locationName: Map<string, string>;
  deepLink: (obs: ReportObservation) => string | undefined;
  pathCell: (obs: ReportObservation, surface: 'boundary' | 'frontView') => CellValue;
}

function observationSheet(
  observations: ReportObservation[],
  notes: LocationNotes[],
  ctx: ObservationSheetContext,
): XLSX.WorkSheet {

  const rows: Row[] = [];

  // Location notes table, above the observations (surveyor sheets only).
  // Omitted entirely when the location has no notes so the observation table
  // stays at the top and its header is row 1.
  if (notes.length > 0) {
    rows.push(['Location Notes', 'Time']);
    notes.forEach((note) => rows.push([note.text, formatTime(note.time)]));
    rows.push([]);
  }

  const observationHeader: Row = ['#', 'Observation ID', 'First seen', 'Last seen', 'Species'];
  if (ctx.includeSurveyor) observationHeader.push('Surveyor');
  observationHeader.push(
    'Location',
    'Seen',
    'Heard',
    'Frequency (kHz)',
    'Direction',
    'Emergence',
    'Notes',
    'Overhead path',
    'Front view path',
  );
  rows.push(observationHeader);

  observations.forEach((obs, index) => {
    const link = ctx.deepLink(obs);
    const row: Row = [
      index + 1,
      obs.id,
      formatTime(obs.firstSeenAt),
      formatTime(obs.lastSeenAt),
      { v: obs.species ?? 'Unknown species', l: link },
    ];
    if (ctx.includeSurveyor) {
      row.push(ctx.surveyorName.get(obs.surveyorId) ?? obs.surveyorId);
    }
    row.push(
      ctx.locationName.get(obs.locationId) ?? obs.locationId,
      obs.seenCount,
      obs.heardCount,
      obs.frequency ?? '',
      obs.direction ?? '',
      obs.emergence ? 'Yes' : 'No',
      obs.notes ?? '',
      ctx.pathCell(obs, 'boundary'),
      ctx.pathCell(obs, 'frontView'),
    );
    rows.push(row);
  });

  const sheet = makeSheet(rows);
  const notesCol = observationHeader.indexOf('Notes');
  sheet['!cols'] = observationHeader.map((_, i) => ({ wch: i === notesCol ? 40 : 16 }));
  return sheet;
}

type LinkCell = { v: string | number; l?: string };
type CellValue = string | number | LinkCell;
type Row = CellValue[];

function isLinkCell(cell: CellValue): cell is LinkCell {
  return typeof cell === 'object' && cell !== null && 'v' in cell;
}

/** Build a worksheet from rows, attaching hyperlinks for any {@link LinkCell}. */
function makeSheet(rows: Row[]): XLSX.WorkSheet {
  const values = rows.map((row) => row.map((cell) => (isLinkCell(cell) ? cell.v : cell)));
  const sheet = XLSX.utils.aoa_to_sheet(values);

  rows.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (!isLinkCell(cell) || !cell.l) return;
      const ref = XLSX.utils.encode_cell({ r, c });
      const target = sheet[ref] ?? (sheet[ref] = { t: 's', v: cell.v });
      target.l = { Target: cell.l, Tooltip: 'Open in report' };
    });
  });

  return sheet;
}

/** Map each observation id to the figure it should deep-link into. */
function buildFigureIndex(model: ReportModel): Map<string, string> {
  const index = new Map<string, string>();
  // Boundary first so an observation visible on the birds-eye view lands there.
  const ordered = [...model.figures].sort((a, b) =>
    a.kind === b.kind ? 0 : a.kind === 'boundary' ? -1 : 1,
  );
  for (const figure of ordered) {
    for (const group of figure.pathGroups) {
      for (const member of group.members) {
        if (!index.has(member.observationId)) index.set(member.observationId, figure.figureId);
      }
    }
  }
  return index;
}

function uniqueSheetName(raw: string, used: Set<string>): string {
  // Excel sheet names: <=31 chars, cannot contain : \ / ? * [ ]
  const base = raw.replace(/[:\\/?*[\]]/g, '-').slice(0, 31).trim() || 'Sheet';
  let name = base;
  let suffix = 2;
  while (used.has(name)) {
    const tail = ` (${suffix++})`;
    name = base.slice(0, 31 - tail.length) + tail;
  }
  used.add(name);
  return name;
}

function formatTime(date: Date | null): string {
  if (!date) return '';
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatDate(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
