import { describe, expect, it } from 'vitest';
import { buildReportHtml, type ResolvedImage } from '../build-html';
import type { ReportModel } from '../../model/report-model';

function baseModel(overrides: Partial<ReportModel> = {}): ReportModel {
  return {
    survey: {
      id: 'svy_1',
      name: 'Bat survey <Alpha>',
      postcode: 'AB1 2CD',
      date: new Date('2026-01-01T00:00:00.000Z'),
      status: 'completed',
      startWeather: {
        temperature: null,
        wind: null,
        humidity: null,
        rain: null,
        cloudCover: null,
      },
      endWeather: {
        temperature: null,
        wind: null,
        humidity: null,
        rain: null,
        cloudCover: null,
      },
    },
    surveyors: [{ id: 'sur_1', name: 'Alex', isLead: true, status: 'done', locationId: 'loc_1' }],
    locations: [{ id: 'loc_1', name: 'North elevation', equipmentInformation: { audioLabel: '', videoLabel: '', otherInfo: '' }, notes: [] }],
    observations: [
      {
        id: 'obs_1',
        surveyorId: 'sur_1',
        locationId: 'loc_1',
        species: 'Noctule',
        firstSeenAt: new Date('2026-01-01T20:00:00.000Z'),
        lastSeenAt: null,
        seenCount: 1,
        heardCount: 0,
        frequency: null,
        direction: null,
        notes: null,
        emergence: false,
        color: '#ff0000',
        label: 'Noctule',
      },
    ],
    figures: [
      {
        figureId: 'boundary',
        kind: 'boundary',
        title: 'Boundary (birds-eye)',
        imageRef: 'boundary/render.png',
        locationId: null,
        paths: [
          {
            observationId: 'obs_1',
            color: '#ff0000',
            label: 'Noctule',
            points: [
              { x: 0.1, y: 0.2 },
              { x: 0.3, y: 0.4 },
            ],
          },
        ],
        pins: [],
      },
    ],
    ...overrides,
  };
}

function images(): Map<string, ResolvedImage> {
  return new Map([
    ['boundary/render.png', { dataUri: 'data:image/png;base64,AAAA', mediaPath: 'media/boundary.png' }],
  ]);
}

describe('buildReportHtml', () => {
  it('produces a self-contained HTML document', () => {
    const html = buildReportHtml(baseModel(), images());
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('<svg id="figure-overlay" viewBox="0 0 1 1"');
    expect(html).toContain('id="report-data"');
    expect(html).toContain('id="checklist"');
  });

  it('embeds the model and image map as a JSON blob', () => {
    const html = buildReportHtml(baseModel(), images());
    const match = html.match(/<script id="report-data" type="application\/json">([\s\S]*?)<\/script>/);
    expect(match).not.toBeNull();
    const parsed = JSON.parse(
      match![1].replace(/\\u003c/g, '<').replace(/\\u003e/g, '>'),
    );
    expect(parsed.model.figures[0].figureId).toBe('boundary');
    expect(parsed.model.figures[0].paths[0].points).toHaveLength(2);
    expect(parsed.images['boundary/render.png'].dataUri).toBe('data:image/png;base64,AAAA');
    expect(parsed.images['boundary/render.png'].mediaPath).toBe('media/boundary.png');
  });

  it('escapes angle brackets so embedded data cannot break out of the script tag', () => {
    const html = buildReportHtml(baseModel(), images());
    const blob = html.split('<script id="report-data" type="application/json">')[1].split('</script>')[0];
    expect(blob).not.toContain('<');
    expect(blob).not.toContain('>');
  });

  it('escapes the survey name in the document title', () => {
    const html = buildReportHtml(baseModel(), images());
    expect(html).toContain('<title>Bat survey &lt;Alpha&gt;</title>');
  });

  it('only embeds images referenced by a figure', () => {
    const extra = images();
    extra.set('unused/ref.png', { dataUri: 'data:image/png;base64,BBBB', mediaPath: 'media/unused.png' });
    const html = buildReportHtml(baseModel(), extra);
    expect(html).not.toContain('unused/ref.png');
    expect(html).not.toContain('BBBB');
  });

  it('includes the browser runtime as an executable IIFE', () => {
    const html = buildReportHtml(baseModel(), images());
    expect(html).toMatch(/<script>\(function[\s\S]*\)\(\);<\/script>/);
  });
});
