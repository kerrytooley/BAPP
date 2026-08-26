jest.mock('expo-file-system/legacy', () => ({
    EncodingType: { Base64: 'base64' },
    cacheDirectory: 'file:///cache/',
    writeAsStringAsync: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
    isAvailableAsync: jest.fn(),
    shareAsync: jest.fn(),
}));

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { shareSurveyExport } from '@services/export/shareExport';

const writeMock = FileSystem.writeAsStringAsync as jest.Mock;
const isAvailableMock = Sharing.isAvailableAsync as jest.Mock;
const shareMock = Sharing.shareAsync as jest.Mock;

describe('shareSurveyExport', () => {
    beforeEach(() => {
        writeMock.mockReset().mockResolvedValue(undefined);
        isAvailableMock.mockReset();
        shareMock.mockReset().mockResolvedValue(undefined);
    });

    it('writes the zip as base64 to the cache directory', async () => {
        isAvailableMock.mockResolvedValue(true);
        await shareSurveyExport(new Uint8Array([77, 97, 110]), 'my-survey-export.zip');
        expect(writeMock).toHaveBeenCalledWith(
            'file:///cache/my-survey-export.zip',
            'TWFu',
            { encoding: 'base64' },
        );
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
