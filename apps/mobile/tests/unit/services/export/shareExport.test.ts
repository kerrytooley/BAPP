jest.mock('expo-file-system', () => ({
    File: jest.fn(),
    Paths: { cache: { uri: 'file:///cache/' } },
}));

jest.mock('expo-sharing', () => ({
    isAvailableAsync: jest.fn(),
    shareAsync: jest.fn(),
}));

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { shareSurveyExport } from '@services/export/shareExport';

const FileMock = File as unknown as jest.Mock;
const createMock = jest.fn();
const writeMock = jest.fn();
const isAvailableMock = Sharing.isAvailableAsync as jest.Mock;
const shareMock = Sharing.shareAsync as jest.Mock;

describe('shareSurveyExport', () => {
    beforeEach(() => {
        createMock.mockReset();
        writeMock.mockReset();
        FileMock.mockReset().mockImplementation((dir: { uri: string }, name: string) => ({
            uri: `${dir.uri}${name}`,
            create: createMock,
            write: writeMock,
        }));
        isAvailableMock.mockReset();
        shareMock.mockReset().mockResolvedValue(undefined);
    });

    it('writes the zip bytes natively to the cache directory, overwriting any previous file', async () => {
        isAvailableMock.mockResolvedValue(true);
        const zip = new Uint8Array([77, 97, 110]);
        await shareSurveyExport(zip, 'my-survey-export.zip');
        expect(FileMock).toHaveBeenCalledWith(Paths.cache, 'my-survey-export.zip');
        expect(createMock).toHaveBeenCalledWith({ overwrite: true });
        expect(writeMock).toHaveBeenCalledWith(zip);
    });

    it('opens the share sheet and returns true when sharing is available', async () => {
        isAvailableMock.mockResolvedValue(true);
        const result = await shareSurveyExport(new Uint8Array([1]), 'x.zip');
        expect(shareMock).toHaveBeenCalledWith('file:///cache/x.zip', {
            mimeType: 'application/zip',
            dialogTitle: 'Share survey export',
            UTI: 'public.zip-archive',
        });
        expect(result).toBe(true);
    });

    it('returns false and does not share when sharing is unavailable', async () => {
        isAvailableMock.mockResolvedValue(false);
        const result = await shareSurveyExport(new Uint8Array([1]), 'x.zip');
        expect(writeMock).toHaveBeenCalled();
        expect(shareMock).not.toHaveBeenCalled();
        expect(result).toBe(false);
    });
});
