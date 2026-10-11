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
    expect(html).toContain('<svg id="figure-overlay" class="figure-overlay" viewBox="0 0 1 1"');
    expect(html).toContain('id="report-data"');
    expect(html).toContain('id="checklist"');
  });

  it('renders a static report that works without JavaScript', () => {
    const html = buildReportHtml(baseModel(), images());
    const staticReport = html.split('<div id="static-report">')[1].split('<main')[0];

    expect(html).toContain('<h1 id="survey-title">Bat survey &lt;Alpha&gt;</h1>');
    expect(html).toContain('AB1 2CD \u2022 01/01/2026 \u2022 completed');
    expect(staticReport).toContain('<h2>Boundary (birds-eye)</h2>');
    expect(staticReport).toContain('<img data-figure-id="boundary" src="data:image/png;base64,AAAA"');
    expect(staticReport).toContain('<polyline points="0.1,0.2 0.3,0.4" stroke="#ff0000"');
    expect(staticReport).toMatch(/class="check-label">Noctule<\/span><span class="check-count">1</);
    expect(html).toContain('<main id="report-main" hidden>');
  });

  it('inlines each base image only once', () => {
    const html = buildReportHtml(baseModel(), images());
    expect(html.split('data:image/png;base64,AAAA')).toHaveLength(2);
  });

  it('lists pins and notes figures without paths in the static legend', () => {
    const model = baseModel();
    model.figures[0] = {
      ...model.figures[0],
      paths: [],
      pins: [{ locationId: 'loc_1', label: 'North elevation', x: 0.5, y: 0.5, surveyorNames: ['Alex'] }],
    };
    const html = buildReportHtml(model, images());
    expect(html).toContain('<span class="pin-marker" style="left:50%;top:50%" title="North elevation (Alex)">');
    expect(html).toContain('North elevation \u2014 Alex');

    model.figures[0] = { ...model.figures[0], pins: [] };
    expect(buildReportHtml(model, images())).toContain('No flight paths on this figure.');
  });

  it('says so when there are no figures', () => {
    const html = buildReportHtml(baseModel({ figures: [] }), images());
    expect(html).toContain('No figures in this report.');
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
    expect(parsed.images['boundary/render.png']).toEqual({ mediaPath: 'media/boundary.png' });
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
