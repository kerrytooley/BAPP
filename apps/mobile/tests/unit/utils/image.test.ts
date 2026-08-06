import { Image } from 'react-native';
import { getAspectRatio } from '@utils/image';

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
});
