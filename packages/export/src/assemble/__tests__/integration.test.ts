import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import {
    NoOpValidator,
    SurveyService,
    type SurveyContext,
} from '@bapp/domain';
import {
    InMemoryLocationRepository,
    InMemorySurveyorRepository,
    InMemoryObservationRepository,
    InMemoryMediaRepository,
    InMemorySurveyRepository,
} from '@bapp/repository';
import { assembleSurveyExport, REPORT_HTML } from '../assemble';
import { JsZipPackager } from '../jszip-packager';
import type { MediaResolver, ResolvedMedia } from '../ports';

// A minimal valid PNG (1x1) so uploads are treated as ready images.
const PNG = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

function makeService() {
    const locationRepo = new InMemoryLocationRepository();
    const surveyorRepo = new InMemorySurveyorRepository();
    const observationRepo = new InMemoryObservationRepository();
    const mediaRepo = new InMemoryMediaRepository();
    const surveyRepo = new InMemorySurveyRepository(locationRepo, surveyorRepo, observationRepo);
    const service = new SurveyService(
        surveyRepo,
        locationRepo,
        surveyorRepo,
        observationRepo,
        mediaRepo,
        new NoOpValidator(),
    );
    return service;
}

/** Resolver that mirrors the mobile adapter: ref -> data: URI -> bytes. */
class ServiceMediaResolver implements MediaResolver {
    constructor(private readonly getUrl: (ref: string) => Promise<string>) {}
    async resolve(ref: string): Promise<ResolvedMedia | null> {
        try {
            const url = await this.getUrl(ref);
            const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(url);
            if (!m) return null;
            const b64 = m[3];
            const bin = Buffer.from(b64, 'base64');
            return { bytes: new Uint8Array(bin), mimeType: m[1] || 'application/octet-stream' };
        } catch {
            return null;
        }
    }
}

async function seedSurvey(service: SurveyService): Promise<string> {
    const survey = await service.createSurvey();
    await service.setBoundaryImage(survey.id, 'boundary.png', PNG);

    const location = await service.addLocation(survey.id, { name: 'North elevation' });
    await service.updateLocation(location.id, { boundaryPosition: { x: 0.5, y: 0.5 } });
    await service.setLocationImage(location.id, 'front.png', PNG, 'frontView');
    await service.setLocationImage(location.id, 'equipment.png', PNG, 'equipment');

    const surveyor = await service.addSurveyor(survey.id, { name: 'Ada', isLead: true });
    await service.updateSurveyor(surveyor.id, { locationId: location.id });

    const obs = await service.addObservation({
        surveyId: survey.id,
        locationId: location.id,
        surveyorId: surveyor.id,
        species: 'Noctule',
    });
    await service.updateObservation(obs.id, {
        flightPaths: [
            { id: 'fp_b', surface: 'boundary', points: [{ x: 0.1, y: 0.2 }, { x: 0.4, y: 0.5 }] },
            { id: 'fp_f', surface: 'frontView', points: [{ x: 0.2, y: 0.3 }, { x: 0.6, y: 0.7 }] },
        ],
    });

    return survey.id;
}

describe('assembleSurveyExport (integration with in-memory repositories)', () => {
    it('reproduces the real on-device data flow end-to-end', async () => {
        const service = makeService();
        const surveyId = await seedSurvey(service);
        const context: SurveyContext = await service.getSurveyContext(surveyId);

        // Sanity: the data really is present in the context.
        expect(context.survey.boundary?.status).toBe('ready');
        expect(context.observations[0].flightPaths).toHaveLength(2);
        expect(context.locations[0].frontViewImage?.status).toBe('ready');
        expect(context.locations[0].equipmentImage?.status).toBe('ready');
        expect(context.locations[0].boundaryPosition).toEqual({ x: 0.5, y: 0.5 });

        const resolver = new ServiceMediaResolver((ref) => service.getMediaUrl(ref));
        const { zip } = await assembleSurveyExport(context, {
            mediaResolver: resolver,
            packager: new JsZipPackager(),
        });

        const archive = await JSZip.loadAsync(zip);
        const html = await archive.file(REPORT_HTML)!.async('string');

        const blob = /<script id="report-data"[^>]*>([\s\S]*?)<\/script>/.exec(html)![1]
            .replace(/\\u003c/g, '<')
            .replace(/\\u003e/g, '>');
        const { model } = JSON.parse(blob) as {
            model: {
                figures: Array<{ figureId: string; kind: string; paths: unknown[]; pins: unknown[] }>;
            };
        };

        expect(html).toContain('data:image/png;base64,'); // boundary/front images inlined
        // A correct export MUST carry the flight paths on its figures.
        const totalPaths = model.figures.reduce((n, f) => n + f.paths.length, 0);
        expect(totalPaths).toBeGreaterThan(0);
        // Equipment photos are NOT shown as figures in the report (media only).
        expect(model.figures.some((f) => f.kind === 'equipment')).toBe(false);
        // Location pins ride on the boundary figure.
        const boundary = model.figures.find((f) => f.kind === 'boundary')!;
        expect(boundary.pins).toHaveLength(1);

        const mediaNames = Object.keys(archive.files).filter((n) => !archive.files[n].dir);
        // Expect boundary + front-view + equipment images in media/.
        expect(mediaNames.some((n) => n.startsWith('media/equip_'))).toBe(true);
        expect(mediaNames.filter((n) => n.startsWith('media/'))).toHaveLength(3);
    });
});
