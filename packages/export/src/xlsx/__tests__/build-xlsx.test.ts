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
      weather: {
        temperature: '15',
        wind: '4',
        humidity: '13',
        rain: 'Wet',
        cloudCover: '40',
      },
    },
    surveyors: [
      { id: 'sur_1', name: 'Alex Lead', isLead: true, status: 'done' },
      { id: 'sur_2', name: 'Sam Two', isLead: false, status: 'done' },
    ],
    locations: [{ id: 'loc_1', name: 'North elevation' }],
    observations: [
      obs({ id: 'obs_1', surveyorId: 'sur_1', firstSeenAt: new Date('2026-08-20T20:05:00Z') }),
      obs({ id: 'obs_2', surveyorId: 'sur_2', species: 'Common Pipistrelle', label: 'Common Pipistrelle', firstSeenAt: new Date('2026-08-20T20:12:00Z') }),
    ],
    figures: [
      {
        figureId: 'boundary',
        kind: 'boundary',
        title: 'Boundary',
        imageRef: 'boundary/render.png',
        locationId: null,
        paths: [
          { observationId: 'obs_1', color: '#e6194B', label: 'Noctule', points: [{ x: 0, y: 0 }] },
        ],
        pins: [],
      },
      {
        figureId: 'loc_loc_1',
        kind: 'frontView',
        title: 'North elevation',
        imageRef: 'loc1/front.png',
        locationId: 'loc_1',
        paths: [
          { observationId: 'obs_2', color: '#3cb44b', label: 'Common Pipistrelle', points: [{ x: 0, y: 0 }] },
        ],
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
    expect(flat).toContain('Weather conditions');
    expect(flat).toContain('Temperature (°C)|15');
    expect(flat).toContain('Wind|4');
    expect(flat).toContain('Humidity (%)|13');
    expect(flat).toContain('Rain|Wet');
    expect(flat).toContain('Cloud cover (%)|40');
  });

  it('lists only a surveyor\'s own observations on their sheet', () => {
    const wb = read(buildReportWorkbook(model()));
    const sheetName = wb.SheetNames.find((n) => n.includes('Sam Two'))!;
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName]);
    expect(rows).toHaveLength(1);
    expect(rows[0].Species).toBe('Common Pipistrelle');
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
            }),
          ],
        }),
      ),
    );
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets['Chronological']);
    expect(rows[0]['Last seen']).toBe('20:09');
    expect(rows[0].Frequency).toBe('45');
    expect(rows[0].Direction).toBe('N-S');
    expect(rows[0].Emergence).toBe('Yes');
    expect(rows[0].Notes).toBe('batty');
    expect(rows[0]['Flight paths']).toBe('View flight paths');
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
            { id: 's1', name: 'Team/A:B', isLead: true, status: 'done' },
            { id: 's2', name: 'Team/A:B', isLead: false, status: 'done' },
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
