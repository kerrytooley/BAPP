jest.mock('@bapp/export', () => ({
    assembleSurveyExport: jest.fn(),
    JsZipPackager: jest.fn().mockImplementation(() => ({ pack: jest.fn() })),
}));

jest.mock('@services/export/expoMediaResolver', () => ({
    ExpoMediaResolver: jest.fn().mockImplementation((fn: unknown) => ({ resolveUrl: fn })),
}));

jest.mock('@services/export/shareExport', () => ({
    shareSurveyExport: jest.fn(),
}));

import { assembleSurveyExport } from '@bapp/export';
import { ExpoMediaResolver } from '@services/export/expoMediaResolver';
import { shareSurveyExport } from '@services/export/shareExport';
import { exportSurvey, type ExportSurveyService } from '@services/export/exportSurvey';
import { buildContext, buildSurvey } from '../../../helpers/factories';

const assembleMock = assembleSurveyExport as jest.Mock;
const shareMock = shareSurveyExport as jest.Mock;
const ResolverMock = ExpoMediaResolver as unknown as jest.Mock;

function makeService(name: string | null): ExportSurveyService {
    return {
        getSurveyContext: jest.fn().mockResolvedValue(
            buildContext({ survey: buildSurvey({ name, postcode: null, date: null }) }),
        ),
        getMediaUrl: jest.fn().mockResolvedValue('file:///cache/x.png'),
    };
}

describe('exportSurvey', () => {
    beforeEach(() => {
        assembleMock.mockReset().mockResolvedValue({ zip: new Uint8Array([1, 2, 3]), files: [] });
        shareMock.mockReset().mockResolvedValue(true);
        ResolverMock.mockClear();
    });

    it('assembles the export and shares it, returning the result', async () => {
        const service = makeService('Dusk count');
        const result = await exportSurvey(service, 'survey-1');

        expect(service.getSurveyContext).toHaveBeenCalledWith('survey-1');
        expect(assembleMock).toHaveBeenCalledTimes(1);
        expect(shareMock).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]), 'dusk-count-results.zip');
        expect(result).toEqual({ fileName: 'dusk-count-results.zip', shared: true });
    });

    it('wires a media resolver backed by the service getMediaUrl', async () => {
        const service = makeService('Survey');
        await exportSurvey(service, 'survey-1');

        const resolveUrl = ResolverMock.mock.calls[0][0] as (ref: string) => Promise<string>;
        await resolveUrl('some-ref');
        expect(service.getMediaUrl).toHaveBeenCalledWith('some-ref');
    });

    it('falls back to "survey" when the name is null', async () => {
        const result = await exportSurvey(makeService(null), 'survey-1');
        expect(result.fileName).toBe('survey-results.zip');
    });

    it('slugifies names with punctuation and trims separators', async () => {
        const result = await exportSurvey(makeService('  Barn: North/South!!  '), 'survey-1');
        expect(result.fileName).toBe('barn-north-south-results.zip');
    });

    it('falls back to "survey" when the name has no slug-able characters', async () => {
        const result = await exportSurvey(makeService('!!!'), 'survey-1');
        expect(result.fileName).toBe('survey-results.zip');
    });

    it('includes slugified postcode and date when present', async () => {
        const service: ExportSurveyService = {
            getSurveyContext: jest.fn().mockResolvedValue(
                buildContext({
                    survey: buildSurvey({
                        name: 'Dusk count',
                        postcode: 'SW1A 1AA',
                        date: new Date(Date.UTC(2026, 6, 13)),
                    }),
                }),
            ),
            getMediaUrl: jest.fn().mockResolvedValue('file:///cache/x.png'),
        };
        const result = await exportSurvey(service, 'survey-1');
        expect(result.fileName).toBe('dusk-count-sw1a-1aa-2026-07-13-results.zip');
    });

    it('propagates the shared=false result', async () => {
        shareMock.mockResolvedValue(false);
        const result = await exportSurvey(makeService('X'), 'survey-1');
        expect(result.shared).toBe(false);
    });
});
