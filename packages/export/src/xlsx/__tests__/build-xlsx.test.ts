import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { buildReportWorkbook } from '../build-xlsx';
import type { ReportModel, ReportObservation } from '../../model/report-model';

function obs(overrides: Partial<ReportObservation> & { id: string }): ReportObservation {
  return {
    surveyorId: 'sur_1',
    locationId: 'loc_1',
    species: 'Noctule',
    firstSeenAt: new Date('2026-08-20T20:05:00Z'),
    lastSeenAt: null,
    seenCount: 1,
    heardCount: 0,
    frequency: null,
    direction: null,
    notes: null,
    emergence: false,
    color: '#e6194B',
    label: 'Noctule',
    overheadPath: null,
    frontViewPath: null,
    ...overrides,
  };
}

function model(overrides: Partial<ReportModel> = {}): ReportModel {
  return {
    survey: {
      id: 'svy_1',
      name: 'Willow Farm Barn',
      postcode: 'GL7 5AB',
      date: new Date('2026-08-20T00:00:00Z'),
      status: 'completed',
      startWeather: {
        temperature: '15',
        wind: '4',
        humidity: '13',
        rain: 'Wet',
        cloudCover: '40',
      },
      endWeather: {
        temperature: '12',
        wind: '2',
        humidity: '20',
        rain: 'Dry',
        cloudCover: '10',
      },
    },
    surveyors: [
      { id: 'sur_1', number: 1, name: 'Alex Lead', isLead: true, status: 'done', locationId: 'loc_1' },
      { id: 'sur_2', number: 2, name: 'Sam Two', isLead: false, status: 'done', locationId: 'loc_1' },
    ],
    locations: [
      {
        id: 'loc_1',
        name: 'North elevation',
        equipmentInformation: { audioLabel: '', videoLabel: '', otherInfo: '' },
        notes: [],
      },
    ],
    observations: [
      obs({ id: 'obs_1', surveyorId: 'sur_1', overheadPath: '1A', firstSeenAt: new Date('2026-08-20T20:05:00Z') }),
      obs({ id: 'obs_2', surveyorId: 'sur_2', species: 'Common Pipistrelle', label: 'Common Pipistrelle', frontViewPath: '2A', firstSeenAt: new Date('2026-08-20T20:12:00Z') }),
    ],
    figures: [
      {
        figureId: 'boundary',
        kind: 'boundary',
        title: 'Boundary',
        imageRef: 'boundary/render.png',
        locationId: null,
        paths: [
          { observationId: 'obs_1', groupId: 'boundary:obs_1', color: '#e6194B', label: '1A', points: [{ x: 0, y: 0 }] },
        ],
        pathGroups: [
          { groupId: 'boundary:obs_1', label: '1A', color: '#e6194B', members: [{ observationId: 'obs_1', surveyorName: 'Alex Lead', time: '20:05', species: 'Noctule' }] },
        ],
        showSurveyorNames: true,
        pins: [],
      },
      {
        figureId: 'loc_loc_1',
        kind: 'frontView',
        title: 'North elevation',
        imageRef: 'loc1/front.png',
        locationId: 'loc_1',
        paths: [
          { observationId: 'obs_2', groupId: 'frontView:obs_2', color: '#3cb44b', label: '2A', points: [{ x: 0, y: 0 }] },
        ],
        pathGroups: [
          { groupId: 'frontView:obs_2', label: '2A', color: '#3cb44b', members: [{ observationId: 'obs_2', surveyorName: 'Sam Two', time: '20:12', species: 'Common Pipistrelle' }] },
        ],
        showSurveyorNames: false,
        pins: [],
      },
    ],
    ...overrides,
  };
}

function read(bytes: Uint8Array): XLSX.WorkBook {
  return XLSX.read(bytes, { type: 'array' });
}

describe('buildReportWorkbook', () => {
  it('emits Overview, one sheet per surveyor, and Chronological', () => {
    const wb = read(buildReportWorkbook(model()));
    expect(wb.SheetNames[0]).toBe('Overview');
    expect(wb.SheetNames[wb.SheetNames.length - 1]).toBe('Chronological');
    // two surveyor sheets between them
    expect(wb.SheetNames.filter((n) => n.startsWith('Surveyor'))).toHaveLength(2);
  });

  it('puts survey metadata on the Overview sheet', () => {
    const wb = read(buildReportWorkbook(model()));
    const overview = XLSX.utils.sheet_to_json<string[]>(wb.Sheets['Overview'], { header: 1 });
    const flat = overview.map((r) => r.join('|'));
    expect(flat).toContain('Survey|Willow Farm Barn');
    expect(flat).toContain('Postcode|GL7 5AB');
    expect(flat).toContain('Observations|2');
  });

  it('puts weather conditions on the Overview sheet', () => {
    const wb = read(buildReportWorkbook(model()));
    const overview = XLSX.utils.sheet_to_json<string[]>(wb.Sheets['Overview'], { header: 1 });
    const flat = overview.map((r) => r.join('|'));
    expect(flat).toContain('Start weather conditions');
    expect(flat).toContain('End weather conditions');
    // start weather
    expect(flat).toContain('Temperature (°C)|15');
    expect(flat).toContain('Wind|4');
    expect(flat).toContain('Humidity (%)|13');
    expect(flat).toContain('Rain|Wet');
    expect(flat).toContain('Cloud cover (%)|40');
    // end weather
    expect(flat).toContain('Temperature (°C)|12');
    expect(flat).toContain('Rain (minutes)|Dry');
    expect(flat).toContain('Cloud cover (%)|10');
  });

  it('lists only a surveyor\'s own observations on their sheet', () => {
    const wb = read(buildReportWorkbook(model()));
    const sheetName = wb.SheetNames.find((n) => n.includes('Sam Two'))!;
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName]);
    expect(rows).toHaveLength(1);
    expect(rows[0].Species).toBe('Common Pipistrelle');
  });

  it('renders location notes above the observations on a surveyor sheet', () => {
    const wb = read(
      buildReportWorkbook(
        model({
          locations: [
            {
              id: 'loc_1',
              name: 'North elevation',
              equipmentInformation: { audioLabel: '', videoLabel: '', otherInfo: '' },
              notes: [
                { text: 'Streetlights on at 21:52', time: new Date('2026-08-20T20:52:00Z') },
              ],
            },
          ],
        }),
      ),
    );
    const sheetName = wb.SheetNames.find((n) => n.includes('Alex Lead'))!;
    const flat = XLSX.utils
      .sheet_to_json<string[]>(wb.Sheets[sheetName], { header: 1 })
      .map((r) => r.join('|'));
    const notesHeader = flat.findIndex((r) => r.startsWith('Location Notes|Time'));
    const obsHeader = flat.findIndex((r) => r.startsWith('#|Observation ID'));
    expect(notesHeader).toBe(0);
    expect(flat.some((r) => r.startsWith('Streetlights on at 21:52|20:52'))).toBe(true);
    // notes table sits above the observations table
    expect(notesHeader).toBeLessThan(obsHeader);
  });

  it('keeps the notes table off the Chronological sheet', () => {
    const wb = read(
      buildReportWorkbook(
        model({
          locations: [
            {
              id: 'loc_1',
              name: 'North elevation',
              equipmentInformation: { audioLabel: '', videoLabel: '', otherInfo: '' },
              notes: [
                { text: 'Streetlights on at 21:52', time: new Date('2026-08-20T20:52:00Z') },
              ],
            },
          ],
        }),
      ),
    );
    const rows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets['Chronological'], { header: 1 });
    // observation header is the first row; no notes table above it
    expect(rows[0][0]).toBe('#');
  });

  it('lists every observation chronologically', () => {
    const wb = read(buildReportWorkbook(model()));
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets['Chronological']);
    expect(rows.map((r) => r.Species)).toEqual(['Noctule', 'Common Pipistrelle']);
    expect(rows[0]['First seen']).toBe('20:05');
    expect(rows.map((r) => r['Observation ID'])).toEqual(['obs_1', 'obs_2']);
  });

  it('includes the extended observation fields on each sheet', () => {
    const wb = read(
      buildReportWorkbook(
        model({
          observations: [
            obs({
              id: 'obs_1',
              surveyorId: 'sur_1',
              lastSeenAt: new Date('2026-08-20T20:09:00Z'),
              frequency: '45',
              direction: 'N-S',
              emergence: true,
              notes: 'batty',
              overheadPath: '1A',
            }),
          ],
        }),
      ),
    );
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets['Chronological']);
    expect(rows[0]['Last seen']).toBe('20:09');
    expect(rows[0]['Frequency (kHz)']).toBe('45');
    expect(rows[0].Direction).toBe('N-S');
    expect(rows[0].Emergence).toBe('Yes');
    expect(rows[0].Notes).toBe('batty');
    expect(rows[0]['Overhead path']).toBe('1A');
    expect(rows[0]['Front view path']).toBe('');
  });

  it('shows each surface\'s flight path label in its own column, linked to that figure', () => {
    const wb = read(buildReportWorkbook(model()));
    const sheet = wb.Sheets['Chronological'];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    expect(rows.map((r) => [r['Overhead path'], r['Front view path']])).toEqual([
      ['1A', ''],
      ['', '2A'],
    ]);
    const header = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })[0];
    const overheadCol = XLSX.utils.encode_col(header.indexOf('Overhead path'));
    const frontCol = XLSX.utils.encode_col(header.indexOf('Front view path'));
    expect(sheet[`${overheadCol}2`].l?.Target?.replace(/&amp;/g, '&')).toBe('flight-paths.html?fig=boundary&obs=obs_1');
    expect(sheet[`${frontCol}3`].l?.Target?.replace(/&amp;/g, '&')).toBe('flight-paths.html?fig=loc_loc_1&obs=obs_2');
  });

  it('leaves a path label unlinked when its figure has no image', () => {
    const wb = read(buildReportWorkbook(model({ figures: [] })));
    const sheet = wb.Sheets['Chronological'];
    const header = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })[0];
    const cell = sheet[`${XLSX.utils.encode_col(header.indexOf('Overhead path'))}2`];
    expect(cell.v).toBe('1A');
    expect(cell.l).toBeUndefined();
  });

  it('names surveyor sheets by surveyor number', () => {
    const wb = read(buildReportWorkbook(model()));
    expect(wb.SheetNames).toContain('Surveyor 1 - Alex Lead');
    expect(wb.SheetNames).toContain('Surveyor 2 - Sam Two');
  });

  it('deep-links each observation cell into flight-paths.html via ?fig=&obs=', () => {
    const wb = read(buildReportWorkbook(model()));
    const sheet = wb.Sheets['Chronological'];
    // Species is column E; first data row is row 2 -> E2.
    // The stored hyperlink XML-escapes '&' to '&amp;' (Excel decodes on open).
    const cell = sheet['E2'];
    expect(cell.l?.Target?.replace(/&amp;/g, '&')).toBe('flight-paths.html?fig=boundary&obs=obs_1');
    const cell2 = sheet['E3'];
    expect(cell2.l?.Target?.replace(/&amp;/g, '&')).toBe('flight-paths.html?fig=loc_loc_1&obs=obs_2');
  });

  it('honours a custom reportHref', () => {
    const wb = read(buildReportWorkbook(model(), { reportHref: 'nested/report.html' }));
    const cell = wb.Sheets['Chronological']['E2'];
    expect(cell.l?.Target?.replace(/&amp;/g, '&')).toBe('nested/report.html?fig=boundary&obs=obs_1');
  });

  it('sanitizes and de-duplicates sheet names', () => {
    const wb = read(
      buildReportWorkbook(
        model({
          surveyors: [
            { id: 's1', number: 1, name: 'Team/A:B', isLead: true, status: 'done', locationId: null },
            { id: 's2', number: 2, name: 'Team/A:B', isLead: false, status: 'done', locationId: null },
          ],
          observations: [],
        }),
      ),
    );
    const surveyorSheets = wb.SheetNames.filter((n) => n.startsWith('Surveyor'));
    expect(new Set(surveyorSheets).size).toBe(surveyorSheets.length);
    surveyorSheets.forEach((n) => {
      expect(n.length).toBeLessThanOrEqual(31);
      expect(n).not.toMatch(/[:\\/?*[\]]/);
    });
  });
});
