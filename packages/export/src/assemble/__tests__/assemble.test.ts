import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import type {
  Location,
  MediaAsset,
  Observation,
  Survey,
  SurveyContext,
  Surveyor,
} from '@bapp/domain';
import {
  assembleSurveyExport,
  MEDIA_DIR,
  REPORT_HTML,
  REPORT_XLSX,
} from '../assemble';
import { JsZipPackager } from '../jszip-packager';
import type { MediaResolver, ResolvedMedia } from '../ports';

const EPOCH = new Date('2026-08-20T20:00:00.000Z');

function media(overrides: Partial<MediaAsset> = {}): MediaAsset {
  return { sourceRef: 'src', renderRef: 'render', status: 'ready', error: null, ...overrides };
}

function survey(overrides: Partial<Survey> = {}): Survey {
  return {
    id: 'svy_1', adminCode: 'A', surveyorCode: 'S', name: 'Willow Farm', postcode: 'GL7 5AB',
    date: EPOCH, sunsetTime: null, startTime: null, endTime: null, boundary: null,
    status: 'completed', weather: {}, data: {}, createdAt: EPOCH, updatedAt: EPOCH, ...overrides,
  };
}

function location(id: string, overrides: Partial<Location> = {}): Location {
  return {
    id, surveyId: 'svy_1', name: `Location ${id}`, boundaryPosition: null,
    frontViewImage: null, equipmentImage: null, data: {}, createdAt: EPOCH, updatedAt: EPOCH, ...overrides,
  };
}

function surveyor(id: string): Surveyor {
  return {
    id, surveyId: 'svy_1', locationId: null, name: `Surveyor ${id}`, isLead: false,
    status: 'done', data: {}, createdAt: EPOCH, updatedAt: EPOCH,
  };
}

function observation(id: string, overrides: Partial<Observation> = {}): Observation {
  return {
    id, surveyId: 'svy_1', locationId: 'loc_1', surveyorId: 'sur_1', species: 'Noctule',
    firstSeenAt: EPOCH, lastSeenAt: null, seenCount: 1, heardCount: 0, frequency: null,
    direction: null, notes: null, emergence: false,
    flightPaths: [{ id: `fp_${id}`, surface: 'boundary', points: [{ x: 0.1, y: 0.2 }, { x: 0.4, y: 0.5 }] }],
    flightPathLinks: [],
    data: {}, createdAt: EPOCH, updatedAt: EPOCH, ...overrides,
  };
}

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);

function context(): SurveyContext {
  return {
    survey: survey({ boundary: media({ renderRef: 'boundary/render.png' }) }),
    surveyors: [surveyor('sur_1')],
    locations: [location('loc_1')],
    observations: [observation('obs_1')],
  };
}

class FakeMediaResolver implements MediaResolver {
  public calls: string[] = [];
  constructor(private readonly table: Record<string, ResolvedMedia>) {}
  async resolve(imageRef: string): Promise<ResolvedMedia | null> {
    this.calls.push(imageRef);
    return this.table[imageRef] ?? null;
  }
}

describe('assembleSurveyExport', () => {
  it('produces a zip containing report.html, survey-data.xlsx and media/', async () => {
    const resolver = new FakeMediaResolver({
      'boundary/render.png': { bytes: PNG_BYTES, mimeType: 'image/png' },
    });
    const { zip, files } = await assembleSurveyExport(context(), {
      mediaResolver: resolver,
      packager: new JsZipPackager(),
    });

    const archive = await JSZip.loadAsync(zip);
    const names = Object.keys(archive.files)
      .filter((n) => !archive.files[n].dir)
      .sort();
    expect(names).toEqual([`${MEDIA_DIR}/boundary.png`, REPORT_HTML, REPORT_XLSX].sort());
    expect(files.map((f) => f.path).sort()).toEqual(names);
  });

  it('inlines the base image as base64 and copies it losslessly into media/', async () => {
    const resolver = new FakeMediaResolver({
      'boundary/render.png': { bytes: PNG_BYTES, mimeType: 'image/png' },
    });
    const { zip } = await assembleSurveyExport(context(), {
      mediaResolver: resolver,
      packager: new JsZipPackager(),
    });

    const archive = await JSZip.loadAsync(zip);
    const html = await archive.file(REPORT_HTML)!.async('string');
    const expectedB64 = Buffer.from(PNG_BYTES).toString('base64');
    expect(html).toContain(`data:image/png;base64,${expectedB64}`);
    expect(html).toContain(`${MEDIA_DIR}/boundary.png`);

    // media/ bytes are the exact original image (no re-encoding).
    const mediaBytes = await archive.file(`${MEDIA_DIR}/boundary.png`)!.async('uint8array');
    expect(Array.from(mediaBytes)).toEqual(Array.from(PNG_BYTES));
  });

  it('embeds a working xlsx that deep-links back into report.html', async () => {
    const resolver = new FakeMediaResolver({
      'boundary/render.png': { bytes: PNG_BYTES, mimeType: 'image/png' },
    });
    const { zip } = await assembleSurveyExport(context(), {
      mediaResolver: resolver,
      packager: new JsZipPackager(),
    });

    const archive = await JSZip.loadAsync(zip);
    const xlsxBytes = await archive.file(REPORT_XLSX)!.async('uint8array');
    const wb = XLSX.read(xlsxBytes, { type: 'array' });
    expect(wb.SheetNames).toContain('Chronological');
    const cell = wb.Sheets['Chronological']['E2'];
    expect(cell.l?.Target?.replace(/&amp;/g, '&')).toBe(`${REPORT_HTML}?fig=boundary&obs=obs_1`);
  });

  it('omits media and inlined image when the resolver returns null', async () => {
    const resolver = new FakeMediaResolver({});
    const { zip } = await assembleSurveyExport(context(), {
      mediaResolver: resolver,
      packager: new JsZipPackager(),
    });

    const archive = await JSZip.loadAsync(zip);
    const names = Object.keys(archive.files)
      .filter((n) => !archive.files[n].dir)
      .sort();
    expect(names).toEqual([REPORT_HTML, REPORT_XLSX].sort());
    const html = await archive.file(REPORT_HTML)!.async('string');
    expect(html).not.toContain('data:image/png;base64,');
  });

  it('resolves each distinct image ref only once', async () => {
    const shared = media({ renderRef: 'shared.png' });
    const ctx: SurveyContext = {
      survey: survey({ boundary: shared }),
      surveyors: [surveyor('sur_1')],
      locations: [location('loc_1', { frontViewImage: media({ renderRef: 'front.png' }) })],
      observations: [
        observation('obs_1'),
        observation('obs_2', {
          flightPaths: [{ id: 'fp_x', surface: 'frontView', points: [{ x: 0, y: 0 }] }],
        }),
      ],
    };
    const resolver = new FakeMediaResolver({
      'shared.png': { bytes: PNG_BYTES, mimeType: 'image/png' },
      'front.png': { bytes: PNG_BYTES, mimeType: 'image/jpeg' },
    });

    await assembleSurveyExport(ctx, { mediaResolver: resolver, packager: new JsZipPackager() });
    expect(resolver.calls.sort()).toEqual(['front.png', 'shared.png']);
  });
});
