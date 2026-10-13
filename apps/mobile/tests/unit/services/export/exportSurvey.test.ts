jest.mock('@bapp/export', () => ({
    assembleSurveyExport: jest.fn(),
    exportFileName: jest.requireActual('@bapp/export').exportFileName,
    JsZipPackager: jest.fn().mockImplementation(() => ({ pack: jest.fn() })),
}));

jest.mock('@services/export/expoMediaResolver', () => ({
    ExpoMediaResolver: jest.fn().mockImplementation((fn: unknown) => ({ resolveUrl: fn })),
}));

jest.mock('@services/export/shareExport', () => ({
    shareSurveyExport: jest.fn(),
    shareExportFile: jest.fn(),
}));

import { assembleSurveyExport, JsZipPackager } from '@bapp/export';
import { ExpoMediaResolver } from '@services/export/expoMediaResolver';
import { shareExportFile, shareSurveyExport } from '@services/export/shareExport';
import { ExportCancelledError, exportSurvey, type ExportSurveyService } from '@services/export/exportSurvey';
import { buildContext, buildSurvey } from '../../../helpers/factories';

const assembleMock = assembleSurveyExport as jest.Mock;
const shareMock = shareSurveyExport as jest.Mock;
const shareFileMock = shareExportFile as jest.Mock;
const ResolverMock = ExpoMediaResolver as unknown as jest.Mock;
const PackagerMock = JsZipPackager as unknown as jest.Mock;

function makeService(name: string | null): ExportSurveyService {
    return {
        getSurveyContext: jest.fn().mockResolvedValue(
            buildContext({ survey: buildSurvey({ name, postcode: null, date: null }) }),
        ),
        getMediaUrl: jest.fn().mockResolvedValue('file:///cache/x.png'),
        supportsServerExport: jest.fn().mockReturnValue(false),
        getServerExport: jest.fn(),
    };
}

describe('exportSurvey', () => {
    beforeEach(() => {
        assembleMock.mockReset().mockResolvedValue({ zip: new Uint8Array([1, 2, 3]), files: [] });
        shareMock.mockReset().mockResolvedValue(true);
        shareFileMock.mockReset().mockResolvedValue(true);
        ResolverMock.mockClear();
        PackagerMock.mockClear();
    });

    it('assembles the export on-device without compression and shares it', async () => {
        const service = makeService('Dusk count');
        const result = await exportSurvey(service, 'survey-1');

        expect(service.getSurveyContext).toHaveBeenCalledWith('survey-1');
        expect(assembleMock).toHaveBeenCalledTimes(1);
        expect(PackagerMock).toHaveBeenCalledWith({ compression: 'STORE' });
        expect(shareMock).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]), 'dusk-count-results.zip');
        expect(result).toEqual({ fileName: 'dusk-count-results.zip', shared: true });
    });

    it('does not share when the export is cancelled mid-build', async () => {
        const controller = new AbortController();
        assembleMock.mockImplementation(async () => {
            controller.abort();
            return { zip: new Uint8Array([1]), files: [] };
        });

        await expect(exportSurvey(makeService('Dusk count'), 'survey-1', controller.signal))
            .rejects.toBeInstanceOf(ExportCancelledError);
        expect(shareMock).not.toHaveBeenCalled();
    });

    it('downloads and shares the server-built export when available', async () => {
        const service = makeService('Dusk count');
        (service.supportsServerExport as jest.Mock).mockReturnValue(true);
        (service.getServerExport as jest.Mock).mockResolvedValue({
            status: 'ready',
            storagePath: 'surveys/survey-1/reports/run/dusk-count-results.zip',
            fileName: 'dusk-count-results.zip',
        });
        (service.getMediaUrl as jest.Mock).mockResolvedValue('file:///cache/dusk-count-results.zip');

        const result = await exportSurvey(service, 'survey-1');

        expect(service.getMediaUrl).toHaveBeenCalledWith('surveys/survey-1/reports/run/dusk-count-results.zip');
        expect(shareFileMock).toHaveBeenCalledWith('file:///cache/dusk-count-results.zip');
        expect(assembleMock).not.toHaveBeenCalled();
        expect(result).toEqual({ fileName: 'dusk-count-results.zip', shared: true });
    });

    it('passes the signal to the server export and skips the download when cancelled', async () => {
        const controller = new AbortController();
        const service = makeService('Dusk count');
        (service.supportsServerExport as jest.Mock).mockReturnValue(true);
        (service.getServerExport as jest.Mock).mockImplementation(async () => {
            controller.abort();
            return { status: 'ready', storagePath: 'surveys/s/reports/r/x.zip', fileName: 'x.zip' };
        });

        await expect(exportSurvey(service, 'survey-1', controller.signal))
            .rejects.toBeInstanceOf(ExportCancelledError);
        expect(service.getServerExport).toHaveBeenCalledWith('survey-1', { signal: controller.signal });
        expect(service.getMediaUrl).not.toHaveBeenCalled();
        expect(shareFileMock).not.toHaveBeenCalled();
        expect(assembleMock).not.toHaveBeenCalled();
    });

    it('falls back to the on-device build when the server export fails', async () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const service = makeService('Dusk count');
        (service.supportsServerExport as jest.Mock).mockReturnValue(true);
        (service.getServerExport as jest.Mock).mockRejectedValue(new Error('offline'));

        const result = await exportSurvey(service, 'survey-1');

        expect(assembleMock).toHaveBeenCalledTimes(1);
        expect(shareFileMock).not.toHaveBeenCalled();
        expect(result).toEqual({ fileName: 'dusk-count-results.zip', shared: true });
        warn.mockRestore();
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
            supportsServerExport: jest.fn().mockReturnValue(false),
            getServerExport: jest.fn(),
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
