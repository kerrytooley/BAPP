import { Image } from 'react-native';

jest.mock('expo-file-system/legacy', () => ({
    EncodingType: { Base64: 'base64' },
    readAsStringAsync: jest.fn(),
}));

import * as FileSystem from 'expo-file-system/legacy';
import { getAspectRatio, createImageBody } from '@utils/image';

const readAsStringAsync = FileSystem.readAsStringAsync as jest.Mock;

afterEach(() => jest.restoreAllMocks());

describe('getAspectRatio', () => {
    it('resolves with the width divided by the height', async () => {
        jest
            .spyOn(Image, 'getSize')
            .mockImplementation((_uri, success) => success?.(200, 100));
        await expect(getAspectRatio('file://b.png')).resolves.toBe(2);
    });

    it('rejects when the image size cannot be read', async () => {
        const failure = new Error('no size');
        jest
            .spyOn(Image, 'getSize')
            .mockImplementation((_uri, _success, error) => error?.(failure));
        await expect(getAspectRatio('file://b.png')).rejects.toBe(failure);
    });

    it('rejects when the image has invalid dimensions', async () => {
        jest
            .spyOn(Image, 'getSize')
            .mockImplementation((_uri, success) => success?.(200, 0));
        await expect(getAspectRatio('file://b.png')).rejects.toThrow(
            'Invalid image dimensions',
        );
    });
});

describe('createImageBody', () => {
    beforeEach(() => readAsStringAsync.mockReset());

    it('reads the file as Base64 and decodes it to bytes', async () => {
        readAsStringAsync.mockResolvedValue('TWFu');

        const body = await createImageBody('file:///tmp/photo.jpg');

        expect(readAsStringAsync).toHaveBeenCalledWith('file:///tmp/photo.jpg', {
            encoding: 'base64',
        });
        expect(Array.from(body.bytes)).toEqual([77, 97, 110]);
    });

    it('derives the file name from the last path segment', async () => {
        readAsStringAsync.mockResolvedValue('TWFu');

        const body = await createImageBody('file:///a/b/c/equipment.png');

        expect(body.fileName).toBe('equipment.png');
    });

    it('propagates errors from the file system read', async () => {
        const failure = new Error('cannot read file');
        readAsStringAsync.mockRejectedValue(failure);

        await expect(createImageBody('file:///tmp/missing.jpg')).rejects.toBe(failure);
    });
});
